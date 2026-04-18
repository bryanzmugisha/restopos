import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = ['ADMIN','MANAGER','SUPER_ADMIN'].includes(session.user.role)

    // Admins see all outlet orders, waiters see only their own
    const where: any = {
      outletId: session.user.outletId,
      status: { not: 'CANCELLED' },
    }
    if (!isAdmin) {
      where.waiterId = session.user.id
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        items: { include: { menuItem: true } },
        table: true,
        waiter: { select: { id: true, name: true } },
        bills: { select: { status: true, totalAmount: true, billNumber: true, paidAt: true } },
        kots: { select: { status: true, kotNumber: true } },
      },
    })

    return NextResponse.json(orders)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch orders', detail: e?.message }, { status: 500 })
  }
}
