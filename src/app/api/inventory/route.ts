import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(ingredients)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const ingredient = await prisma.ingredient.create({
      data: {
        name: body.name,
        unit: body.unit,
        currentStock: body.currentStock ?? 0,
        reorderLevel: body.reorderLevel ?? 0,
        costPerUnit: body.costPerUnit ?? 0,
      },
    })
    return NextResponse.json(ingredient, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    const current = await prisma.ingredient.findUnique({ where: { id: body.id } })
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const delta = body.type === 'add' ? body.quantity : -body.quantity
    const newStock = Math.max(0, current.currentStock + delta)

    const [ingredient] = await prisma.$transaction([
      prisma.ingredient.update({
        where: { id: body.id },
        data: { currentStock: newStock },
      }),
      prisma.stockTransaction.create({
        data: {
          outletId: session.user.outletId,
          ingredientId: body.id,
          type: body.reason ?? (body.type === 'add' ? 'PURCHASE' : 'ADJUSTMENT_REMOVE'),
          quantity: delta,
          stockBefore: current.currentStock,
          stockAfter: newStock,
          createdBy: session.user.id,
          notes: body.notes ?? null,
        },
      }),
    ])

    return NextResponse.json(ingredient)
  } catch {
    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 })
  }
}
