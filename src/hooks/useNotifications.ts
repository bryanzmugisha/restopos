'use client'
import { useEffect, useCallback } from 'react'

// Request browser notification permission
export function useNotifications() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const notify = useCallback((title: string, body: string, icon = '/icons/icon-192x192.png') => {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, { body, icon, badge: icon, vibrate: [200, 100, 200] })
      setTimeout(() => n.close(), 8000)
    }

    // Sound notification (if we have a notification sound)
    try {
      // Create a simple beep using Web Audio API
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
      }
    } catch {}
  }, [])

  const notifyNewOrder = useCallback((orderNumber: string, tableNo?: string) => {
    notify(
      '🍽️ New Order!',
      `${orderNumber}${tableNo ? ` · Table ${tableNo}` : ''} — Check kitchen display`,
    )
  }, [notify])

  const notifyOrderReady = useCallback((orderNumber: string) => {
    notify('✅ Order Ready', `${orderNumber} is ready to serve!`)
  }, [notify])

  const notifyPayment = useCallback((orderNumber: string, amount: string) => {
    notify('💰 Payment Received', `${orderNumber} — ${amount} paid`)
  }, [notify])

  return { notify, notifyNewOrder, notifyOrderReady, notifyPayment }
}
