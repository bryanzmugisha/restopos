import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const floors = await prisma.floor.findMany({
      where: { outletId: session.user.outletId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    })
    return NextResponse.json(floors)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const table = await prisma.table.update({
      where: { id: body.id },
      data: { status: body.status },
    })
    return NextResponse.json(table)
  } catch {
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}
