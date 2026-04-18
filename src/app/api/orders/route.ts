import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

function makeOrderNumber() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `ORD-${date}-${rand}`
}

function makeKotNumber() {
  return `KOT-${String(Date.now()).slice(-6)}`
}

export async function GET(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const orders = await prisma.order.findMany({
      where: {
        outletId: session.user.outletId,
        ...(status ? { status } : { status: { not: 'CANCELLED' } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        items: { include: { menuItem: true } },
        table: true,
        customer: true,
        waiter: true,
        kots: true,
        bills: true,
      },
    })
    return NextResponse.json(orders)
  } catch (e: any) {
    console.error('GET /api/orders error:', e?.message)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { orderType, tableId, customerId, items, notes, subtotal, taxAmount, totalAmount } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 })
    }

    // Verify outlet exists
    const outlet = await prisma.outlet.findUnique({ where: { id: session.user.outletId } })
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found. Please log out and log in again.' }, { status: 400 })
    }

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
      return NextResponse.json({ error: 'User session invalid. Please log out and log in again.' }, { status: 400 })
    }

    // Create order + items + KOT
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the order
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

      // 2. Create order items
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

      // 3. Create KOT
      await tx.kot.create({
        data: {
          kotNumber: makeKotNumber(),
          orderId: newOrder.id,
          status: 'PENDING',
        },
      })

      // 4. Mark table as OCCUPIED if dine-in
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'OCCUPIED' },
        })
      }

      return newOrder
    })

    return NextResponse.json(order, { status: 201 })
  } catch (e: any) {
    // Return the actual DB error message to help debug
    const msg = e?.message ?? 'Unknown error'
    console.error('POST /api/orders error:', msg)
    return NextResponse.json(
      { error: 'Failed to create order', detail: msg },
      { status: 500 }
    )
  }
}
