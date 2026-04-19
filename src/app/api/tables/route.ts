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
      include: { tables: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    })
    return NextResponse.json(floors)
  } catch (e: any) { return NextResponse.json({ error: 'Failed to fetch tables', detail: e?.message }, { status: 500 }) }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const table = await prisma.table.create({
      data: { name: body.name, capacity: body.capacity ?? 4, floorId: body.floorId, status: 'VACANT' },
    })
    return NextResponse.json(table, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: 'Failed to create table', detail: e?.message }, { status: 500 }) }
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
  } catch (e: any) { return NextResponse.json({ error: 'Failed to update table', detail: e?.message }, { status: 500 }) }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const table = await prisma.table.update({
      where: { id: body.id },
      data: { name: body.name, capacity: body.capacity },
    })
    return NextResponse.json(table)
  } catch (e: any) { return NextResponse.json({ error: 'Failed to update table', detail: e?.message }, { status: 500 }) }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Table ID required' }, { status: 400 })
    // Soft delete
    await prisma.table.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: 'Failed to delete table', detail: e?.message }, { status: 500 }) }
}
