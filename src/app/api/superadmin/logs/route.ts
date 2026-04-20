import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const level = searchParams.get('level')
    const category = searchParams.get('category')
    const outletId = searchParams.get('outletId')

    const where: any = {}
    if (level) where.level = level
    if (category) where.category = category
    if (outletId) where.outletId = outletId

    const logs = await (prisma as any).systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json(logs.map((l: any) => ({
      ...l,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
    })))
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}
