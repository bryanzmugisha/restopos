'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export default function OrderNotifier() {
  const { data: session, status } = useSession()
  const lastKotCount = useRef(0)
  const lastOrderReady = useRef(0)
  const lastUnreadChat = useRef(0)
  const initialized = useRef(false)

  const beep = useCallback((type: 'order'|'chat'|'ping' = 'order') => {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      if (!AC) return
      const ctx = new AC()
      const freqs = type === 'ping' ? [660, 880, 660] : type === 'chat' ? [523, 659] : [440, 550]
      const delays = type === 'ping' ? [0, 0.15, 0.3] : type === 'chat' ? [0, 0.15] : [0, 0.25]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.35, ctx.currentTime + delays[i])
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delays[i] + 0.25)
        osc.start(ctx.currentTime + delays[i])
        osc.stop(ctx.currentTime + delays[i] + 0.25)
      })
    } catch {}
  }, [])

  const showNotif = useCallback((title: string, body: string, beepType: 'order'|'chat'|'ping' = 'order') => {
    beep(beepType)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body, icon: '/icons/icon-192x192.png' } as NotificationOptions)
        setTimeout(() => n.close(), 7000)
      } catch {}
    }
  }, [beep])

  const poll = useCallback(async () => {
    if (!session) return
    const role = session.user.role

    try {
      // 1. Kitchen KOTs — notify kitchen + admin
      if (['ADMIN','MANAGER','KITCHEN_STAFF'].includes(role)) {
        const res = await fetch('/api/kots')
        if (res.ok) {
          const kots = await res.json()
          const pending = Array.isArray(kots) ? kots.filter((k: any) => k.status === 'PENDING').length : 0
          if (initialized.current && pending > lastKotCount.current) {
            const n = pending - lastKotCount.current
            showNotif('🍳 New Kitchen Order!', `${n} new order${n>1?'s':''} waiting in kitchen`, 'order')
          }
          lastKotCount.current = pending
        }
      }

      // 2. Ready orders — notify cashier + admin
      if (['ADMIN','MANAGER','CASHIER'].includes(role)) {
        const res = await fetch('/api/orders')
        if (res.ok) {
          const orders = await res.json()
          const ready = Array.isArray(orders) ? orders.filter((o: any) => o.status === 'READY').length : 0
          if (initialized.current && ready > lastOrderReady.current) {
            showNotif('✅ Order Ready!', `${ready} order${ready>1?'s':''} ready to be billed`, 'order')
          }
          lastOrderReady.current = ready
        }
      }

      // 3. Bar KOTs — notify bar staff
      if (['ADMIN','MANAGER','BAR_STAFF'].includes(role)) {
        const res = await fetch('/api/bar')
        if (res.ok) {
          const kots = await res.json()
          const pending = Array.isArray(kots) ? kots.filter((k: any) => k.status === 'PENDING').length : 0
          if (initialized.current && pending > lastKotCount.current && role === 'BAR_STAFF') {
            showNotif('🍺 New Bar Order!', `${pending} drink order${pending>1?'s':''} waiting`, 'order')
          }
        }
      }

      // 4. Chat messages — ALL staff
      try {
        const res = await fetch('/api/chat/conversations')
        if (res.ok) {
          const convs = await res.json()
          const totalUnread = Array.isArray(convs)
            ? convs.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0)
            : 0
          if (initialized.current && totalUnread > lastUnreadChat.current) {
            const newMsgs = totalUnread - lastUnreadChat.current
            // Check if any are PINGs (more urgent)
            const hasPing = Array.isArray(convs) && convs.some((c: any) =>
              c.messages?.[0]?.type === 'PING'
            )
            if (hasPing) {
              showNotif('🔔 PING!', 'Someone urgently needs your attention — check chat', 'ping')
            } else {
              showNotif('💬 New Message', `${newMsgs} new message${newMsgs>1?'s':''} in Staff Chat`, 'chat')
            }
          }
          lastUnreadChat.current = totalUnread
        }
      } catch {}

      initialized.current = true
    } catch {}
  }, [session, showNotif])

  useEffect(() => {
    if (status !== 'authenticated' || !session) return

    // Request notification permission on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    poll()
    const interval = setInterval(poll, 15000)
    return () => clearInterval(interval)
  }, [status, session, poll])

  return null
}
