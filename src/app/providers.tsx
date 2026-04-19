'use client'
import { SessionProvider } from 'next-auth/react'
import dynamic from 'next/dynamic'

// Load PWAInstall only on client to avoid server component issues
const PWAInstall = dynamic(() => import('@/components/PWAInstall'), { ssr: false })

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <PWAInstall />
    </SessionProvider>
  )
}
