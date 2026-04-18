import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const outlet = await prisma.outlet.findUnique({
      where: { id: session.user.outletId },
    })
    return NextResponse.json(outlet)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['ADMIN','MANAGER'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const outlet = await prisma.outlet.update({
      where: { id: session.user.outletId },
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        currency: body.currency,
      },
    })
    return NextResponse.json(outlet)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update settings', detail: e?.message }, { status: 500 })
  }
}
