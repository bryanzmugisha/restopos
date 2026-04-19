import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const conversations = await prisma.conversation.findMany({
      where: {
        outletId: session.user.outletId,
        members: { some: { userId: session.user.id } },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
      },
    })

    // Count unread messages for each conversation
    const withUnread = await Promise.all(conversations.map(async (conv) => {
      const member = conv.members.find(m => m.userId === session.user.id)
      const unreadCount = member ? await prisma.message.count({
        where: { conversationId: conv.id, createdAt: { gt: member.lastReadAt }, senderId: { not: session.user.id } },
      }) : 0
      return { ...conv, unreadCount }
    }))

    return NextResponse.json(withUnread)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { type, name, memberIds } = body

    if (!memberIds || memberIds.length === 0)
      return NextResponse.json({ error: 'At least one member required' }, { status: 400 })

    const allMemberIds = [...new Set([session.user.id, ...memberIds])]

    // For direct messages, check if conversation already exists
    if (type === 'DIRECT' && allMemberIds.length === 2) {
      const existing = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          outletId: session.user.outletId,
          members: { every: { userId: { in: allMemberIds } } },
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, role: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })
      if (existing) return NextResponse.json({ ...existing, unreadCount: 0 })
    }

    const conversation = await prisma.conversation.create({
      data: {
        outletId: session.user.outletId,
        type: type ?? 'DIRECT',
        name: name || null,
        members: {
          create: allMemberIds.map(uid => ({ userId: uid })),
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    return NextResponse.json({ ...conversation, unreadCount: 0 }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to create conversation', detail: e?.message }, { status: 500 })
  }
}
