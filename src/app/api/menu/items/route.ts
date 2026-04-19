import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      include: { category: true },
    })
    return NextResponse.json(items)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch items', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    if (!body.name || !body.categoryId || !body.price) {
      return NextResponse.json({ error: 'Name, category and price are required' }, { status: 400 })
    }

    // If no station set on item, inherit from category
    let station = body.station || null
    if (!station && body.categoryId) {
      const cat = await prisma.menuCategory.findUnique({ where: { id: body.categoryId } })
      station = (cat as any)?.station || 'KITCHEN'
    }

    const item = await prisma.menuItem.create({
      data: {
        name: body.name,
        description: body.description || null,
        categoryId: body.categoryId,
        price: Number(body.price),
        costPrice: Number(body.costPrice) || 0,
        isActive: body.isActive !== false,
        sortOrder: body.sortOrder || 0,
        station,
      },
      include: { category: true },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to create item', detail: e?.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    // If no station set, inherit from category
    let station = body.station || null
    if (!station && body.categoryId) {
      const cat = await prisma.menuCategory.findUnique({ where: { id: body.categoryId } })
      station = (cat as any)?.station || 'KITCHEN'
    }

    const item = await prisma.menuItem.update({
      where: { id: body.id },
      data: {
        name: body.name,
        description: body.description || null,
        categoryId: body.categoryId,
        price: Number(body.price),
        costPrice: Number(body.costPrice) || 0,
        isActive: body.isActive,
        station,
      },
      include: { category: true },
    })
    return NextResponse.json(item)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update item', detail: e?.message }, { status: 500 })
  }
}
