import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { items, subtotalAdd, taxAdd } = body

    if (!items || items.length === 0) return NextResponse.json({ error: 'No items provided' }, { status: 400 })

    // Verify order belongs to this outlet and is still open
    const order = await prisma.order.findFirst({
      where: { id: params.id, outletId: session.user.outletId, status: { in: ['OPEN','IN_PROGRESS'] } },
    })
    if (!order) return NextResponse.json({ error: 'Order not found or already closed' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // Add new items
      await tx.orderItem.createMany({
        data: items.map((item: any) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          status: 'PENDING',
        })),
      })

      // Update order totals
      await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal: { increment: subtotalAdd },
          taxAmount: { increment: taxAdd },
          totalAmount: { increment: subtotalAdd + taxAdd },
          status: 'IN_PROGRESS',
        },
      })

      // Create new KOT for the added items
      const kotNum = `KOT-${String(Date.now()).slice(-6)}`
      await tx.kot.create({
        data: { kotNumber: kotNum, orderId: order.id, status: 'PENDING' },
      })
    })

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { menuItem: true } }, table: true, bills: true },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to add items', detail: e?.message }, { status: 500 })
  }
}
