import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (e: any) { console.error("Failed to fetch categories:", e?.message)
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
  } catch (e: any) { console.error("Failed to create category:", e?.message)
    return NextResponse.json({ error: 'Failed to create category', detail: e?.message }, { status: 500 })
  }
}
