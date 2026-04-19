import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function makeOrderNumber() {
  const d = new Date()
  return `ORD-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`
}

export async function GET(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status')
    // Support comma-separated statuses
    const statusFilter = statusParam
      ? statusParam.includes(',')
        ? { status: { in: statusParam.split(',') } }
        : { status: statusParam }
      : { status: { not: 'CANCELLED' } }
    const orders = await prisma.order.findMany({
      where: {
        outletId: session.user.outletId,
        ...statusFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        items: { include: { menuItem: { include: { category: true } } } },
        table: true, customer: true, waiter: true, kots: true, bills: true,
      },
    })
    return NextResponse.json(orders)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch orders', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { orderType, tableId, customerId, items, notes, subtotal, taxAmount, totalAmount } = body

    if (!items || items.length === 0)
      return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 })

    const outlet = await prisma.outlet.findUnique({ where: { id: session.user.outletId } })
    if (!outlet) return NextResponse.json({ error: 'Outlet not found' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 })

    // Fetch menu items with their category stations
    const menuItemIds = items.map((i: any) => i.menuItemId)
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { category: true },
    })
    const itemStationMap: Record<string, string> = {}
    menuItems.forEach(mi => {
      // Use item's own station if set, otherwise fall back to category station
      itemStationMap[mi.id] = (mi as any).station || mi.category?.station || 'KITCHEN'
    })

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: makeOrderNumber(),
          outletId: session.user.outletId,
          waiterId: session.user.id,
          orderType: orderType ?? 'DINE_IN',
          tableId: tableId || null,
          customerId: customerId || null,
          notes: notes || null,
          subtotal: Number(subtotal) || 0,
          taxAmount: Number(taxAmount) || 0,
          totalAmount: Number(totalAmount) || 0,
          status: 'OPEN',
        },
      })

      await tx.orderItem.createMany({
        data: items.map((item: any) => ({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.unitPrice) * Number(item.quantity),
          notes: item.notes || null,
          status: 'PENDING',
        })),
      })

      // Create separate KOTs per station
      const stations: string[] = Array.from(new Set(items.map((i: any) => itemStationMap[i.menuItemId] ?? 'KITCHEN')))
      for (const station of stations) {
        await tx.kot.create({
          data: {
            kotNumber: `KOT-${String(Date.now()).slice(-6)}-${station.slice(0,3)}`,
            orderId: newOrder.id,
            station,
            status: 'PENDING',
          },
        })
      }

      if (tableId) {
        await tx.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } })
      }

      return newOrder
    })

    return NextResponse.json(order, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/orders error:', e?.message)
    return NextResponse.json({ error: 'Failed to create order', detail: e?.message }, { status: 500 })
  }
}
