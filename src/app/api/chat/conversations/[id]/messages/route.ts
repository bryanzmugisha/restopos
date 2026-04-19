import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify member
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
    })
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const messages = await prisma.message.findMany({
      where: { conversationId: params.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    // Mark as read
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
      data: { lastReadAt: new Date() },
    })

    return NextResponse.json(messages)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
    })
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const body = await req.json()
    const { content, type, orderId, metadata } = body

    if (!content?.trim()) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })

    const message = await prisma.message.create({
      data: {
        conversationId: params.id,
        senderId: session.user.id,
        content: content.trim(),
        type: type ?? 'TEXT',
        orderId: orderId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to send message', detail: e?.message }, { status: 500 })
  }
}
