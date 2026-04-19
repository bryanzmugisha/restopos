'use client'
import { SessionProvider } from 'next-auth/react'
import PWAInstall from '@/components/PWAInstall'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <PWAInstall />
    </SessionProvider>
  )
}
