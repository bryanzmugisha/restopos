import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['ADMIN','MANAGER','SUPER_ADMIN'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const range = parseInt(searchParams.get('range') ?? '1')

    const from = new Date()
    from.setDate(from.getDate() - range)
    from.setHours(0,0,0,0)

    const orders = await prisma.order.findMany({
      where: {
        outletId: session.user.outletId,
        createdAt: { gte: from },
        waiterId: { not: null },
      },
      include: {
        waiter: { select: { id: true, name: true, role: true } },
        bills: { select: { status: true, totalAmount: true } },
        items: true,
      },
    })

    // Group by waiter
    const staffMap: Record<string, {
      id: string; name: string; role: string
      totalOrders: number; completedOrders: number; openOrders: number
      totalRevenue: number; pendingRevenue: number
      totalItems: number; avgOrderValue: number
    }> = {}

    for (const order of orders) {
      if (!order.waiter) continue
      const wid = order.waiter.id
      if (!staffMap[wid]) {
        staffMap[wid] = { id: wid, name: order.waiter.name, role: order.waiter.role, totalOrders: 0, completedOrders: 0, openOrders: 0, totalRevenue: 0, pendingRevenue: 0, totalItems: 0, avgOrderValue: 0 }
      }
      const s = staffMap[wid]
      s.totalOrders++
      s.totalItems += order.items.reduce((sum, i) => sum + i.quantity, 0)

      const paid = order.bills.some(b => b.status === 'PAID')
      if (paid || order.status === 'COMPLETED') {
        s.completedOrders++
        s.totalRevenue += order.totalAmount
      } else if (['OPEN','IN_PROGRESS','READY'].includes(order.status)) {
        s.openOrders++
        s.pendingRevenue += order.totalAmount
      }
    }

    const staff = Object.values(staffMap).map(s => ({
      ...s,
      avgOrderValue: s.completedOrders > 0 ? Math.round(s.totalRevenue / s.completedOrders) : 0,
    })).sort((a,b) => b.totalRevenue - a.totalRevenue)

    return NextResponse.json({ staff, range, generatedAt: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}
