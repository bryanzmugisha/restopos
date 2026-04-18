import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session || session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const outlets = await prisma.outlet.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, orders: true } } },
    })
    return NextResponse.json(outlets)
  } catch (e: any) { return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 }) }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session || session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { name, address, phone, currency, adminName, adminEmail, adminPin, adminPassword } = body

    if (!name || !adminName || !adminPin) return NextResponse.json({ error: 'Name, admin name and PIN required' }, { status: 400 })

    const result = await prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.create({
        data: { name, address: address || null, phone: phone || null, currency: currency || 'UGX' }
      })

      const hash = await bcrypt.hash(adminPassword || adminPin, 10)
      await tx.user.create({
        data: {
          name: adminName, email: adminEmail || null, pin: adminPin,
          passwordHash: hash, role: 'ADMIN', outletId: outlet.id,
        }
      })

      // Create default floor
      const floor = await tx.floor.create({ data: { name: 'Main Floor', outletId: outlet.id, sortOrder: 0 } })

      // Create default tables
      for (let i = 1; i <= 6; i++) {
        await tx.table.create({ data: { name: `T${i}`, capacity: 4, floorId: floor.id, status: 'VACANT' } })
      }

      return outlet
    })

    return NextResponse.json({ outlet: result }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: 'Failed to create outlet', detail: e?.message }, { status: 500 }) }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAuth()
    if (!session || session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id, isActive } = await req.json()
    const outlet = await prisma.outlet.update({ where: { id }, data: { isActive } })
    return NextResponse.json(outlet)
  } catch (e: any) { return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 }) }
}
