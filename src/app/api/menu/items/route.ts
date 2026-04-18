import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      include: { category: true },
    })
    return NextResponse.json(items)
  } catch (e: any) { console.error("Failed to fetch menu items:", e?.message)
    return NextResponse.json({ error: 'Failed to fetch menu items', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const item = await prisma.menuItem.create({
      data: {
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        price: body.price,
        costPrice: body.costPrice ?? 0,
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e: any) { console.error("Failed to create item:", e?.message)
    return NextResponse.json({ error: 'Failed to create item', detail: e?.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const item = await prisma.menuItem.update({
      where: { id: body.id },
      data: {
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        price: body.price,
        costPrice: body.costPrice,
        isActive: body.isActive,
      },
    })
    return NextResponse.json(item)
  } catch (e: any) { console.error("Failed to update item:", e?.message)
    return NextResponse.json({ error: 'Failed to update item', detail: e?.message }, { status: 500 })
  }
}
