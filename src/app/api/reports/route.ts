export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') ?? '7'
    const days = parseInt(range)

    const from = new Date()
    from.setDate(from.getDate() - days)
    from.setHours(0,0,0,0)

    const orders = await prisma.order.findMany({
      where: {
        outletId: session.user.outletId,
        status: 'COMPLETED',
        closedAt: { gte: from },
      },
      include: {
        items: { include: { menuItem: true } },
        bills: { include: { payments: true } },
      },
    })

    // Daily breakdown
    const dailyMap: Record<string, { revenue: number; orders: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0,10)
      dailyMap[key] = { revenue: 0, orders: 0 }
    }

    let totalRevenue = 0, totalOrders = 0
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    const paymentMap: Record<string, number> = {}

    for (const order of orders) {
      const key = (order.closedAt ?? order.createdAt).toISOString().slice(0,10)
      if (dailyMap[key]) {
        dailyMap[key].revenue += order.totalAmount
        dailyMap[key].orders += 1
      }
      totalRevenue += order.totalAmount
      totalOrders += 1

      for (const item of order.items) {
        const id = item.menuItemId
        if (!itemMap[id]) itemMap[id] = { name: item.menuItem.name, qty: 0, revenue: 0 }
        itemMap[id].qty += item.quantity
        itemMap[id].revenue += item.totalPrice
      }

      for (const bill of order.bills) {
        for (const payment of bill.payments) {
          paymentMap[payment.method] = (paymentMap[payment.method] ?? 0) + payment.amount
        }
      }
    }

    const daily = Object.entries(dailyMap).map(([day, v]) => ({ day, ...v }))
    const topItems = Object.values(itemMap).sort((a,b) => b.qty - a.qty).slice(0, 10)
    const paymentBreakdown = Object.entries(paymentMap).map(([method, amount]) => ({ method, amount }))

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      daily,
      topItems,
      paymentBreakdown,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
