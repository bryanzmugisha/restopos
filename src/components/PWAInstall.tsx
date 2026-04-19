'use client'
import { useEffect, useState } from 'react'

export default function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [platform, setPlatform] = useState<'android'|'ios'|'desktop'|null>(null)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW error:', err))
    }

    // Detect platform
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isAndroid = /Android/.test(ua)
    setPlatform(isIOS ? 'ios' : isAndroid ? 'android' : 'desktop')

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsInstalled(isStandalone)

    // Don't show if dismissed recently
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) return
    }

    // Android: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      if (!isStandalone) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    
    // iOS: show manual instructions if not installed
    if (isIOS && !isStandalone) {
      setTimeout(() => setShowBanner(true), 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const result = await installPrompt.userChoice
      if (result.outcome === 'accepted') {
        setIsInstalled(true)
        setShowBanner(false)
      }
    }
    setShowBanner(false)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (!showBanner || isInstalled) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(16px, env(safe-area-inset-bottom))',
      left: '12px',
      right: '12px',
      zIndex: 1000,
      background: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '16px',
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      {/* Icon */}
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
        🍽️
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fafafa', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' }}>Install RestoPOS</p>
        {platform === 'ios' ? (
          <p style={{ color: '#71717a', fontSize: '12px', margin: 0 }}>
            Tap <strong style={{ color: '#3b82f6' }}>Share</strong> → <strong style={{ color: '#3b82f6' }}>Add to Home Screen</strong>
          </p>
        ) : (
          <p style={{ color: '#71717a', fontSize: '12px', margin: 0 }}>
            Install as an app — works offline
          </p>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={handleDismiss}
          style={{ padding: '7px 12px', borderRadius: '8px', background: 'transparent', border: '1px solid #3f3f46', color: '#71717a', cursor: 'pointer', fontSize: '13px' }}>
          Later
        </button>
        {platform !== 'ios' && (
          <button onClick={handleInstall}
            style={{ padding: '7px 14px', borderRadius: '8px', background: '#f97316', border: 'none', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
            Install
          </button>
        )}
      </div>
    </div>
  )
}
