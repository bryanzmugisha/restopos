import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentPin, newPin } = await req.json()
    if (!newPin || newPin.length < 4) return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Verify current PIN if user has one
    if (user.pin && user.pin !== currentPin) {
      return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 400 })
    }

    // Check PIN not already in use by another user
    const conflict = await prisma.user.findFirst({
      where: { pin: newPin, outletId: user.outletId, isActive: true, id: { not: user.id } }
    })
    if (conflict) return NextResponse.json({ error: 'This PIN is already used by another staff member' }, { status: 409 })

    await prisma.user.update({ where: { id: user.id }, data: { pin: newPin } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update PIN', detail: e?.message }, { status: 500 })
  }
}
