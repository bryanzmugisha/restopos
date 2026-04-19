'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export default function OrderNotifier() {
  const { data: session, status } = useSession()
  const lastOrderCount = useRef(0)
  const lastKotCount = useRef(0)
  const initialized = useRef(false)

  const beep = useCallback(() => {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      if (!AC) return
      const ctx = new AC()
      const delays = [0, 0.3]
      delays.forEach(delay => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.3)
      })
    } catch {}
  }, [])

  const showNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, {
        body, icon: '/icons/icon-192x192.png',
        tag: 'restopos-order',
      })
      setTimeout(() => n.close(), 6000)
    }
    beep()
  }, [beep])

  const poll = useCallback(async () => {
    if (!session) return
    const role = session.user.role

    try {
      // Kitchen staff poll KOTs
      if (['ADMIN','MANAGER','KITCHEN_STAFF'].includes(role)) {
        const res = await fetch('/api/kots')
        if (res.ok) {
          const kots = await res.json()
          const pending = Array.isArray(kots) ? kots.filter((k: any) => k.status === 'PENDING').length : 0
          if (initialized.current && pending > lastKotCount.current) {
            showNotification('🍳 New Kitchen Order!', `${pending - lastKotCount.current} new order(s) in the kitchen`)
          }
          lastKotCount.current = pending
        }
      }

      // Bar staff poll bar KOTs
      if (['ADMIN','MANAGER','BAR_STAFF'].includes(role)) {
        const res = await fetch('/api/bar')
        if (res.ok) {
          const kots = await res.json()
          const pending = Array.isArray(kots) ? kots.filter((k: any) => k.status === 'PENDING').length : 0
          if (initialized.current && pending > lastKotCount.current && role === 'BAR_STAFF') {
            showNotification('🍺 New Bar Order!', `${pending} drink order(s) waiting`)
          }
        }
      }

      // Cashier/Admin poll for ready orders
      if (['ADMIN','MANAGER','CASHIER'].includes(role)) {
        const res = await fetch('/api/orders')
        if (res.ok) {
          const orders = await res.json()
          const ready = Array.isArray(orders) ? orders.filter((o: any) => o.status === 'READY').length : 0
          if (initialized.current && ready > lastOrderCount.current) {
            showNotification('✅ Order Ready!', `${ready} order(s) ready for billing`)
          }
          lastOrderCount.current = ready
        }
      }

      initialized.current = true
    } catch {}
  }, [session, showNotification])

  useEffect(() => {
    if (status !== 'authenticated' || !session) return

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Poll every 15 seconds
    poll()
    const interval = setInterval(poll, 15000)
    return () => clearInterval(interval)
  }, [status, session, poll])

  return null // No UI - just background polling
}

// Chat notification check - exported for use in chat page
export async function checkUnreadMessages(): Promise<number> {
  try {
    const res = await fetch('/api/chat/conversations')
    if (res.ok) {
      const convs = await res.json()
      return Array.isArray(convs) ? convs.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0) : 0
    }
  } catch {}
  return 0
}
