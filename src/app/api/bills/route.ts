import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

function billNumber() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  return `BILL-${date}-${Math.floor(Math.random()*9000)+1000}`
}

export async function GET(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'OPEN'

    const bills = await prisma.bill.findMany({
      where: {
        status,
        order: { outletId: session.user.outletId },
      },
      orderBy: { generatedAt: 'desc' },
      include: {
        order: { include: { table: true } },
        payments: true,
        billItems: true,
      },
    })
    return NextResponse.json(bills)
  } catch (e: any) { console.error("Failed to fetch bills:", e?.message)
    return NextResponse.json({ error: 'Failed to fetch bills' }, detail: e?.message, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { orderId, subtotal, taxAmount, discountAmount, totalAmount, payments } = body

    const bill = await prisma.$transaction(async (tx) => {
      const newBill = await tx.bill.create({
        data: {
          billNumber: billNumber(),
          orderId,
          subtotal,
          taxAmount: taxAmount ?? 0,
          discountAmount: discountAmount ?? 0,
          totalAmount,
          amountPaid: totalAmount,
          status: 'PAID',
          paidAt: new Date(),
        },
      })

      // Create payment records
      if (payments && payments.length > 0) {
        await tx.payment.createMany({
          data: payments.map((p: any) => ({
            billId: newBill.id,
            method: p.method,
            amount: p.amount,
            reference: p.reference ?? null,
          })),
        })
      }

      // Mark order as completed
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', closedAt: new Date() },
      })

      // Free table
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'UNCLEAN' },
        })
      }

      // Update customer spend + loyalty
      if (order.customerId) {
        const loyaltyEarned = Math.floor(totalAmount / 1000) // 1 point per 1000 UGX
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalSpent: { increment: totalAmount },
            totalVisits: { increment: 1 },
            loyaltyPoints: { increment: loyaltyEarned },
          },
        })
      }

      return newBill
    })

    return NextResponse.json(bill, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to process bill' }, { status: 500 })
  }
}
