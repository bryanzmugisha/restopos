import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { targetUserId, message } = await req.json()
    if (!targetUserId) return NextResponse.json({ error: 'Target user required' }, { status: 400 })

    // Find or create DM conversation
    const allIds = [session.user.id, targetUserId].sort()

    let conv = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        outletId: session.user.outletId,
        AND: allIds.map(uid => ({ members: { some: { userId: uid } } })),
      },
    })

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          outletId: session.user.outletId,
          type: 'DIRECT',
          members: { create: allIds.map(uid => ({ userId: uid })) },
        },
      })
    }

    // Send PING message
    const pingMsg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: session.user.id,
        content: message || `🔔 ${session.user.name} is pinging you!`,
        type: 'PING',
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, conversationId: conv.id, message: pingMsg })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to ping', detail: e?.message }, { status: 500 })
  }
}
