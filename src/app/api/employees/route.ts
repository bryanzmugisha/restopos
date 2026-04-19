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
  } catch (e: any) { console.error("Failed to fetch employees:", e?.message)
    return NextResponse.json({ error: 'Failed to fetch employees', detail: e?.message }, { status: 500 })
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
  } catch (e: any) { console.error("Failed to create employee:", e?.message)
    return NextResponse.json({ error: 'Failed to create employee', detail: e?.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['ADMIN','MANAGER'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()

    const employee = await prisma.$transaction(async (tx) => {
      // Update user record
      const userUpdate: any = {
        name: body.name,
        pin: body.pin,
        role: body.role,
      }
      if (body.email) userUpdate.email = body.email
      if (body.password) {
        const bcrypt = require('bcryptjs')
        userUpdate.passwordHash = await bcrypt.hash(body.password, 10)
      }
      await tx.user.update({ where: { id: body.userId }, data: userUpdate })

      // Update employee record
      return tx.employee.update({
        where: { id: body.id },
        data: {
          position: body.position || null,
          salaryType: body.salaryType,
          salaryAmount: Number(body.salaryAmount) || 0,
          joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined,
        },
        include: { user: { select: { id: true, name: true, email: true, pin: true, role: true } } },
      })
    })

    return NextResponse.json(employee)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update employee', detail: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['ADMIN','MANAGER'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const emp = await prisma.employee.findUnique({ where: { id }, include: { user: true } })
    if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Deactivate both employee and user records
    await prisma.$transaction([
      prisma.employee.update({ where: { id }, data: { isActive: false } }),
      prisma.user.update({ where: { id: emp.userId }, data: { isActive: false } }),
    ])

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to delete employee', detail: e?.message }, { status: 500 })
  }
}
