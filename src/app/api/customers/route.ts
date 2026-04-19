import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? ''

    const customers = await prisma.customer.findMany({
      where: q ? {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
        ],
      } : {},
      orderBy: { totalSpent: 'desc' },
      take: 100,
    })
    return NextResponse.json(customers)
  } catch (e: any) { console.error("Failed to fetch customers:", e?.message)
    return NextResponse.json({ error: 'Failed to fetch customers' }, detail: e?.message, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(customer, { status: 201 })
  } catch (e: any) { console.error("Failed to create customer:", e?.message)
    return NextResponse.json({ error: 'Failed to create customer' }, detail: e?.message, { status: 500 })
  }
}
