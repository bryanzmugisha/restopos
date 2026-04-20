import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import { logEvent, PLAN_MODULES, ModuleKey } from '@/lib/system'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const outlets = await prisma.outlet.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, orders: true } },
      },
    })

    const enriched = await Promise.all(outlets.map(async (o: any) => {
      const today = new Date(new Date().setHours(0, 0, 0, 0))
      const todayOrders = await prisma.order.count({
        where: { outletId: o.id, createdAt: { gte: today } },
      })
      const todayRevenue = await prisma.bill.aggregate({
        where: { outletId: o.id, paidAt: { gte: today }, status: 'PAID' },
        _sum: { totalAmount: true },
      })
      return {
        ...o,
        modules: o.modules ? JSON.parse(o.modules) : null,
        todayOrders,
        todayRevenue: todayRevenue._sum.totalAmount ?? 0,
      }
    }))

    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { name, address, phone, email, currency, plan, modules, adminName, adminEmail, adminPin, adminPassword, expiresAt, maxStaff, maxOrders } = body

    if (!name || !adminName || !adminPin) {
      return NextResponse.json({ error: 'Restaurant name, admin name and PIN required' }, { status: 400 })
    }

    const enabledModules: ModuleKey[] = modules && Array.isArray(modules) && modules.length > 0
      ? modules
      : (PLAN_MODULES[plan ?? 'BASIC'] ?? PLAN_MODULES.BASIC)

    const result = await prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.create({
        data: {
          name,
          address: address || null,
          phone: phone || null,
          email: email || null,
          currency: currency || 'UGX',
          plan: plan || 'BASIC',
          modules: JSON.stringify(enabledModules),
          maxStaff: Number(maxStaff) || 10,
          maxOrders: Number(maxOrders) || 1000,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true,
        } as any,
      })

      const hash = await bcrypt.hash(adminPassword || adminPin, 10)
      const admin = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail || null,
          pin: adminPin,
          passwordHash: hash,
          role: 'ADMIN',
          outletId: outlet.id,
        },
      })

      return { outlet, admin }
    })

    await logEvent({
      level: 'INFO', category: 'SYSTEM',
      message: `New restaurant created: ${name} (${plan})`,
      outletId: result.outlet.id,
      userId: session.user.id,
      metadata: { plan, modules: enabledModules },
    })

    return NextResponse.json({ ...result.outlet, admin: { name: result.admin.name, pin: result.admin.pin } }, { status: 201 })
  } catch (e: any) {
    await logEvent({ level: 'ERROR', category: 'SYSTEM', message: 'Failed to create outlet', metadata: { error: e?.message } })
    return NextResponse.json({ error: 'Failed to create restaurant', detail: e?.message }, { status: 500 })
  }
}
