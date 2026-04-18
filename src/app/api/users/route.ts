import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['ADMIN','MANAGER'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const users = await prisma.user.findMany({
      where: { outletId: session.user.outletId, role: { not: 'SUPER_ADMIN' } },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, email: true, pin: true,
        role: true, isActive: true, createdAt: true,
      },
    })
    return NextResponse.json(users)
  } catch (e: any) { console.error("Failed to fetch users:", e?.message)
    return NextResponse.json({ error: 'Failed to fetch users' }, detail: e?.message, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN')
      return NextResponse.json({ error: 'Only admins can create users' }, { status: 403 })

    const body = await req.json()
    if (!body.name || !body.pin)
      return NextResponse.json({ error: 'Name and PIN are required' }, { status: 400 })

    // Check PIN uniqueness within outlet
    const existing = await prisma.user.findFirst({
      where: { pin: body.pin, outletId: session.user.outletId, isActive: true },
    })
    if (existing)
      return NextResponse.json({ error: 'PIN already in use' }, { status: 409 })

    const passwordHash = await bcrypt.hash(body.pin, 10)
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email ?? null,
        pin: body.pin,
        passwordHash,
        role: body.role ?? 'WAITER',
        outletId: session.user.outletId,
      },
      select: {
        id: true, name: true, email: true, pin: true,
        role: true, isActive: true, createdAt: true,
      },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e: any) { console.error("Failed to create user:", e?.message)
    return NextResponse.json({ error: 'Failed to create user' }, detail: e?.message, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN')
      return NextResponse.json({ error: 'Only admins can edit users' }, { status: 403 })

    const body = await req.json()

    // Check PIN conflict (excluding this user)
    if (body.pin) {
      const conflict = await prisma.user.findFirst({
        where: { pin: body.pin, outletId: session.user.outletId, isActive: true, id: { not: body.id } },
      })
      if (conflict)
        return NextResponse.json({ error: 'PIN already in use' }, { status: 409 })
    }

    const updateData: any = {
      name: body.name,
      email: body.email ?? null,
      role: body.role,
      ...(body.pin ? { pin: body.pin, passwordHash: await bcrypt.hash(body.pin, 10) } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    }

    const user = await prisma.user.update({
      where: { id: body.id },
      data: updateData,
      select: {
        id: true, name: true, email: true, pin: true,
        role: true, isActive: true, createdAt: true,
      },
    })
    return NextResponse.json(user)
  } catch (e: any) { console.error("Failed to update user:", e?.message)
    return NextResponse.json({ error: 'Failed to update user' }, detail: e?.message, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN')
      return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    if (id === session.user.id)
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) { console.error("Failed to delete user:", e?.message)
    return NextResponse.json({ error: 'Failed to delete user' }, detail: e?.message, { status: 500 })
  }
}
