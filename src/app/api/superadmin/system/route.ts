import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const [
      totalOutlets, activeOutlets,
      totalUsers, totalOrders, todayOrders,
      todayRevenue, weekRevenue, monthRevenue,
      criticalLogs, errorLogs, recentLogs,
      recentOrders,
    ] = await Promise.all([
      prisma.outlet.count(),
      prisma.outlet.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.bill.aggregate({ where: { paidAt: { gte: today }, status: 'PAID' }, _sum: { totalAmount: true } }),
      prisma.bill.aggregate({ where: { paidAt: { gte: weekAgo }, status: 'PAID' }, _sum: { totalAmount: true } }),
      prisma.bill.aggregate({ where: { paidAt: { gte: monthAgo }, status: 'PAID' }, _sum: { totalAmount: true } }),
      (prisma as any).systemLog.count({ where: { level: 'CRITICAL', createdAt: { gte: weekAgo } } }),
      (prisma as any).systemLog.count({ where: { level: 'ERROR', createdAt: { gte: weekAgo } } }),
      (prisma as any).systemLog.findMany({ where: { createdAt: { gte: hourAgo } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.order.count({ where: { createdAt: { gte: hourAgo } } }),
    ])

    // Per-outlet activity
    const outletStats = await prisma.outlet.findMany({
      where: { isActive: true },
      select: { id: true, name: true, plan: true } as any,
    })

    const perOutlet = await Promise.all(outletStats.map(async (o) => {
      const [orders24h, lastOrder] = await Promise.all([
        prisma.order.count({ where: { outletId: o.id, createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } } as any }),
        prisma.order.findFirst({ where: { outletId: o.id } as any, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      ])
      const minutesSinceLast = lastOrder ? Math.floor((Date.now() - lastOrder.createdAt.getTime()) / 60000) : null
      return {
        id: o.id, name: o.name, plan: o.plan,
        orders24h, lastOrderMinAgo: minutesSinceLast,
        status: !lastOrder ? 'inactive' : minutesSinceLast! > 1440 ? 'idle' : 'active',
      }
    }))

    return NextResponse.json({
      overview: {
        totalOutlets, activeOutlets,
        totalUsers, totalOrders, todayOrders,
        todayRevenue: todayRevenue._sum.totalAmount ?? 0,
        weekRevenue: weekRevenue._sum.totalAmount ?? 0,
        monthRevenue: monthRevenue._sum.totalAmount ?? 0,
        criticalLogs, errorLogs,
        recentOrdersHourly: recentOrders,
      },
      health: {
        status: criticalLogs > 0 ? 'CRITICAL' : errorLogs > 5 ? 'WARNING' : 'HEALTHY',
        databaseConnected: true,
      },
      perOutlet,
      recentLogs: recentLogs.map(l => ({
        ...l,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}
