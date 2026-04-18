import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        customer: true,
        waiter: true,
        kots: true,
        bills: { include: { payments: true } },
      },
    })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch (e: any) { console.error("Failed to fetch order:", e?.message)
    return NextResponse.json({ error: 'Failed to fetch order', detail: e?.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: body.status,
        ...(body.status === 'COMPLETED' || body.status === 'CANCELLED'
          ? { closedAt: new Date() }
          : {}),
      },
    })

    // Free up table on close
    if ((body.status === 'COMPLETED' || body.status === 'CANCELLED') && order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'UNCLEAN' },
      })
    }

    return NextResponse.json(order)
  } catch (e: any) { console.error("Failed to update order:", e?.message)
    return NextResponse.json({ error: 'Failed to update order', detail: e?.message }, { status: 500 })
  }
}
