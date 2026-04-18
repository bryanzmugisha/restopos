import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const kots = await prisma.kot.findMany({
      where: {
        status: { not: 'COMPLETED' },
        order: { outletId: session.user.outletId },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
            table: true,
          },
        },
      },
    })

    const formatted = kots.map(k => ({
      id: k.id,
      kotNumber: k.kotNumber,
      orderNumber: k.order.orderNumber,
      tableNo: k.order.table?.name,
      orderType: k.order.orderType,
      status: k.status,
      createdAt: k.createdAt,
      items: k.order.items.map(i => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        notes: i.notes,
      })),
    }))

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch KOTs' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    const kot = await prisma.kot.update({
      where: { id: body.id },
      data: {
        status: body.status,
        ...(body.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
        ...(body.status === 'IN_PROGRESS' ? { acknowledgedAt: new Date() } : {}),
      },
    })

    // Update order status when all KOTs complete
    if (body.status === 'COMPLETED') {
      const allKots = await prisma.kot.findMany({ where: { orderId: kot.orderId } })
      const allDone = allKots.every(k => k.status === 'COMPLETED')
      if (allDone) {
        await prisma.order.update({
          where: { id: kot.orderId },
          data: { status: 'READY' },
        })
      }
    }

    return NextResponse.json(kot)
  } catch {
    return NextResponse.json({ error: 'Failed to update KOT' }, { status: 500 })
  }
}
