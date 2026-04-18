import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')

    // Find by bill ID or by orderId
    let bill = null

    if (orderId) {
      // Find the latest paid bill for this order
      bill = await prisma.bill.findFirst({
        where: { orderId, order: { outletId: session.user.outletId } },
        orderBy: { generatedAt: 'desc' },
        include: {
          order: { include: { table: true, customer: true, waiter: { select: { name: true } }, items: { include: { menuItem: true } }, outlet: true } },
          payments: true,
        },
      })
    } else {
      bill = await prisma.bill.findFirst({
        where: { id: params.id, order: { outletId: session.user.outletId } },
        include: {
          order: { include: { table: true, customer: true, waiter: { select: { name: true } }, items: { include: { menuItem: true } }, outlet: true } },
          payments: true,
        },
      })
    }

    if (!bill) {
      // If no bill found by orderId, return order data as a pro-forma receipt
      if (orderId) {
        const order = await prisma.order.findFirst({
          where: { id: orderId, outletId: session.user.outletId },
          include: { table: true, customer: true, waiter: { select: { name: true } }, items: { include: { menuItem: true } }, outlet: true },
        })
        if (order) {
          return NextResponse.json({
            billId: null, billNumber: 'PRO-FORMA', orderNumber: order.orderNumber,
            outletName: order.outlet.name, outletAddress: order.outlet.address ?? '',
            outletPhone: order.outlet.phone ?? '', currency: order.outlet.currency ?? 'UGX',
            tableNo: order.table?.name ?? null, orderType: order.orderType,
            customerName: order.customer?.name ?? null, customerPhone: order.customer?.phone ?? null,
            items: order.items.map(i => ({ name: i.menuItem.name, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice })),
            subtotal: order.subtotal, taxAmount: order.taxAmount, discountAmount: 0,
            totalAmount: order.totalAmount, amountPaid: 0, changeGiven: 0,
            paymentMethod: 'PENDING', payments: [], cashierName: order.waiter?.name ?? 'Staff',
            paidAt: order.createdAt.toISOString(), status: 'UNPAID',
          })
        }
      }
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    const outlet = bill.order.outlet
    return NextResponse.json({
      billId: bill.id, billNumber: bill.billNumber, orderNumber: bill.order.orderNumber,
      outletName: outlet.name, outletAddress: outlet.address ?? '',
      outletPhone: outlet.phone ?? '', currency: outlet.currency ?? 'UGX',
      tableNo: bill.order.table?.name ?? null, orderType: bill.order.orderType,
      customerName: bill.order.customer?.name ?? null, customerPhone: bill.order.customer?.phone ?? null,
      items: bill.order.items.map(i => ({ name: i.menuItem.name, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice })),
      subtotal: bill.subtotal, taxAmount: bill.taxAmount, discountAmount: bill.discountAmount,
      totalAmount: bill.totalAmount, amountPaid: bill.amountPaid,
      changeGiven: Math.max(0, bill.amountPaid - bill.totalAmount),
      paymentMethod: bill.payments[0]?.method ?? 'CASH',
      payments: bill.payments, cashierName: bill.order.waiter?.name ?? 'Staff',
      paidAt: (bill.paidAt ?? bill.generatedAt).toISOString(), status: bill.status,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch receipt', detail: e?.message }, { status: 500 })
  }
}
