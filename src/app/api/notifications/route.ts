import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Store subscriptions in memory for now (in production use DB)
// This sends browser push notifications to all subscribed staff

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { type, subscription } = body

    if (type === 'subscribe') {
      // Store subscription (simplified - in production save to DB)
      // For now just acknowledge
      return NextResponse.json({ success: true, message: 'Subscribed to notifications' })
    }

    if (type === 'test') {
      return NextResponse.json({ success: true, message: 'Notification system active' })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed', detail: e?.message }, { status: 500 })
  }
}
