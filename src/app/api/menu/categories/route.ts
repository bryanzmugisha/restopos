import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch categories', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const category = await prisma.menuCategory.create({
      data: { name: body.name, sortOrder: body.sortOrder ?? 0, station: body.station ?? 'KITCHEN' },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to create category', detail: e?.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const category = await prisma.menuCategory.update({
      where: { id: body.id },
      data: {
        name: body.name,
        station: body.station ?? 'KITCHEN',
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return NextResponse.json(category)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update category', detail: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await prisma.menuCategory.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to delete category', detail: e?.message }, { status: 500 })
  }
}
