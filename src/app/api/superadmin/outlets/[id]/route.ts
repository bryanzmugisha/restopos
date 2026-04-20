import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import { logEvent } from '@/lib/system'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.address !== undefined) updateData.address = body.address
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.plan !== undefined) updateData.plan = body.plan
    if (body.modules !== undefined) updateData.modules = JSON.stringify(body.modules)
    if (body.maxStaff !== undefined) updateData.maxStaff = Number(body.maxStaff)
    if (body.maxOrders !== undefined) updateData.maxOrders = Number(body.maxOrders)
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const outlet = await prisma.outlet.update({
      where: { id: params.id },
      data: updateData as any,
    })

    await logEvent({
      level: 'INFO', category: 'SYSTEM',
      message: `Outlet ${outlet.name} updated by ${session.user.name}`,
      outletId: params.id,
      userId: session.user.id,
      metadata: { changes: Object.keys(updateData) },
    })

    return NextResponse.json(outlet)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Soft delete - just deactivate
    const outlet = await prisma.outlet.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    await logEvent({
      level: 'WARN', category: 'SYSTEM',
      message: `Outlet ${outlet.name} deactivated`,
      outletId: params.id, userId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}
