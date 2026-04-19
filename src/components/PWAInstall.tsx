'use client'
import { useEffect, useState } from 'react'

export default function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isInstalled, setIsInstalled] = useState(true) // default true to prevent flash
  const [platform, setPlatform] = useState<'android'|'ios'|'other'>('other')

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    setPlatform(isIOS ? 'ios' : isAndroid ? 'android' : 'other')

    // Already installed as PWA?
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsInstalled(standalone)

    if (standalone) return // Don't show if already installed

    // Check if dismissed recently (7 days)
    const dismissed = localStorage.getItem('pwa-dismissed')
    if (dismissed && (Date.now() - parseInt(dismissed)) < 7 * 24 * 60 * 60 * 1000) return

    // Android: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setTimeout(() => setShow(true), 5000) // Show after 5s on page
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show after 8s
    if (isIOS) setTimeout(() => setShow(true), 8000)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') { setIsInstalled(true); setShow(false) }
    }
    setShow(false)
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-dismissed', Date.now().toString())
  }

  if (!show || isInstalled) return null

  return (
    <>
      {/* Backdrop to prevent interaction with page */}
      <div style={{ position:'fixed', inset:0, zIndex:998, pointerEvents:'none' }} />

      {/* Banner - fixed at very bottom, above everything */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        background: '#1c1c1e',
        borderTop: '1px solid #3f3f46',
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'#f97316', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>🍽️</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:'#fafafa', fontWeight:'700', fontSize:'14px', margin:'0 0 1px' }}>Install RestoPOS</p>
          {platform === 'ios'
            ? <p style={{ color:'#71717a', fontSize:'11px', margin:0 }}>Tap <strong style={{ color:'#3b82f6' }}>Share ↑</strong> → <strong style={{ color:'#3b82f6' }}>Add to Home Screen</strong></p>
            : <p style={{ color:'#71717a', fontSize:'11px', margin:0 }}>Works offline · No browser bar · Fast</p>
          }
        </div>
        <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
          <button onClick={dismiss} style={{ padding:'7px 10px', borderRadius:'8px', background:'transparent', border:'1px solid #3f3f46', color:'#71717a', cursor:'pointer', fontSize:'12px' }}>Later</button>
          {platform !== 'ios' && (
            <button onClick={install} style={{ padding:'7px 14px', borderRadius:'8px', background:'#f97316', border:'none', color:'white', cursor:'pointer', fontSize:'13px', fontWeight:'700' }}>Install</button>
          )}
        </div>
      </div>
    </>
  )
}
