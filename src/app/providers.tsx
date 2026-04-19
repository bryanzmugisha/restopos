'use client'
import { SessionProvider } from 'next-auth/react'
import dynamic from 'next/dynamic'

const PWAInstall = dynamic(() => import('@/components/PWAInstall'), { ssr: false })
const OrderNotifier = dynamic(() => import('@/components/OrderNotifier'), { ssr: false })

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <OrderNotifier />
      <PWAInstall />
    </SessionProvider>
  )
}
