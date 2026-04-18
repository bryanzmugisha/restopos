import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const kots = await prisma.kot.findMany({
      where: {
        station: { in: ['BAR','COUNTER','ALL'] },
        order: { outletId: session.user.outletId },
        status: { not: 'CANCELLED' },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        order: {
          include: {
            table: true,
            waiter: { select: { name: true } },
            items: {
              include: { menuItem: { include: { category: true } } },
            },
          },
        },
      },
    })

    return NextResponse.json(kots)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch bar orders', detail: e?.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { kotId, status } = await req.json()
    const validStatuses = ['IN_PROGRESS','READY','COMPLETED']
    if (!validStatuses.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

    const kot = await prisma.kot.update({
      where: { id: kotId },
      data: {
        status,
        ...(status === 'IN_PROGRESS' ? { acknowledgedAt: new Date() } : {}),
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
    })

    // If all KOTs for this order are ready/completed, update order status
    if (status === 'READY' || status === 'COMPLETED') {
      const allKots = await prisma.kot.findMany({ where: { orderId: kot.orderId } })
      const allDone = allKots.every(k => ['READY','COMPLETED'].includes(k.status))
      const allCompleted = allKots.every(k => k.status === 'COMPLETED')
      if (allDone) {
        await prisma.order.update({
          where: { id: kot.orderId },
          data: { status: allCompleted ? 'READY' : 'IN_PROGRESS' },
        })
      }
    }

    return NextResponse.json(kot)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update bar order', detail: e?.message }, { status: 500 })
  }
}
