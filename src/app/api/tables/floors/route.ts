import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const floor = await prisma.floor.create({
      data: { name: body.name, outletId: session.user.outletId, sortOrder: 0 },
    })
    return NextResponse.json(floor, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: 'Failed to create floor', detail: e?.message }, { status: 500 }) }
}
