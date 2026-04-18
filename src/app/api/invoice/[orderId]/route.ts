import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const order = await prisma.order.findFirst({
      where: { id: params.orderId, outletId: session.user.outletId },
      include: {
        table: true,
        customer: true,
        waiter: { select: { name: true } },
        items: { include: { menuItem: true } },
        outlet: true,
      },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    return NextResponse.json({
      orderNumber: order.orderNumber,
      outletName: order.outlet.name,
      outletAddress: order.outlet.address ?? '',
      outletPhone: order.outlet.phone ?? '',
      currency: order.outlet.currency ?? 'UGX',
      tableNo: order.table?.name ?? null,
      orderType: order.orderType,
      orderStatus: order.status,
      customerName: order.customer?.name ?? null,
      customerPhone: order.customer?.phone ?? null,
      waiterName: order.waiter?.name ?? null,
      items: order.items.map(i => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch invoice', detail: e?.message }, { status: 500 })
  }
}
