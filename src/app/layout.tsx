import type { Metadata, Viewport } from 'next'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'RestoPOS',
  description: 'Restaurant Management System',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#09090b', color: '#fafafa', fontFamily: 'system-ui, sans-serif', height: '100vh', overflow: 'hidden' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
