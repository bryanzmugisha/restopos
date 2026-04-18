import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employees = await prisma.employee.findMany({
      where: { outletId: session.user.outletId, isActive: true },
      include: { user: true },
      orderBy: { user: { name: 'asc' } },
    })
    return NextResponse.json(employees)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    const employee = await prisma.$transaction(async (tx) => {
      const hash = await bcrypt.hash(body.password ?? body.pin, 10)
      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email ?? null,
          pin: body.pin,
          passwordHash: hash,
          role: body.role,
          outletId: session.user.outletId,
        },
      })
      return tx.employee.create({
        data: {
          userId: user.id,
          outletId: session.user.outletId,
          position: body.position ?? null,
          salaryType: body.salaryType ?? 'MONTHLY',
          salaryAmount: body.salaryAmount ?? 0,
          joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
        },
        include: { user: true },
      })
    })

    return NextResponse.json(employee, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
