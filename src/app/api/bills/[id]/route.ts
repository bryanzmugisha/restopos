import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const bill = await prisma.bill.findFirst({
      where: { id: params.id, order: { outletId: session.user.outletId } },
      include: {
        order: {
          include: {
            table: true,
            customer: true,
            waiter: { select: { name: true } },
            items: { include: { menuItem: true } },
            outlet: true,
          },
        },
        payments: true,
        billItems: true,
      },
    })

    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    // Format as receipt data
    const outlet = bill.order.outlet
    const receipt = {
      billId: bill.id,
      billNumber: bill.billNumber,
      orderNumber: bill.order.orderNumber,
      outletName: outlet.name,
      outletAddress: outlet.address ?? '',
      outletPhone: outlet.phone ?? '',
      currency: outlet.currency ?? 'UGX',
      tableNo: bill.order.table?.name ?? null,
      orderType: bill.order.orderType,
      customerName: bill.order.customer?.name ?? null,
      customerPhone: bill.order.customer?.phone ?? null,
      items: bill.order.items.map(i => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      subtotal: bill.subtotal,
      taxAmount: bill.taxAmount,
      discountAmount: bill.discountAmount,
      totalAmount: bill.totalAmount,
      amountPaid: bill.amountPaid,
      changeGiven: Math.max(0, bill.amountPaid - bill.totalAmount),
      paymentMethod: bill.payments[0]?.method ?? 'CASH',
      payments: bill.payments,
      cashierName: bill.order.waiter?.name ?? 'Staff',
      paidAt: bill.paidAt?.toISOString() ?? bill.generatedAt.toISOString(),
    }

    return NextResponse.json(receipt)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch bill', detail: e?.message }, { status: 500 })
  }
}
