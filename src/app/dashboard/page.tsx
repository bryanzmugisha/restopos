'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const roleRoutes: Record<string, { label: string; href: string; icon: string; color: string }[]> = {
  SUPER_ADMIN: [
    { label: 'All Restaurants', href: '/superadmin', icon: '🏪', color: '#f97316' },
  ],
  ADMIN: [
    { label: 'POS / Orders', href: '/pos', icon: '🧾', color: '#f97316' },
    { label: 'Tables', href: '/tables', icon: '🪑', color: '#3b82f6' },
    { label: 'Kitchen (KDS)', href: '/kitchen', icon: '👨‍🍳', color: '#22c55e' },
    { label: 'Billing', href: '/billing', icon: '💳', color: '#a855f7' },
    { label: 'Menu', href: '/menu', icon: '📋', color: '#f59e0b' },
    { label: 'Reports', href: '/reports', icon: '📊', color: '#06b6d4' },
    { label: 'Inventory', href: '/inventory', icon: '📦', color: '#ec4899' },
    { label: 'Customers', href: '/customers', icon: '👥', color: '#84cc16' },
    { label: 'Reservations', href: '/reservations', icon: '📅', color: '#8b5cf6' },
    { label: 'Employees', href: '/employees', icon: '👤', color: '#14b8a6' },
    { label: 'Users', href: '/users', icon: '🔑', color: '#ec4899' },
    { label: 'Settings', href: '/settings', icon: '⚙️', color: '#6b7280' },
  ],
  MANAGER: [
    { label: 'POS / Orders', href: '/pos', icon: '🧾', color: '#f97316' },
    { label: 'Tables', href: '/tables', icon: '🪑', color: '#3b82f6' },
    { label: 'Kitchen (KDS)', href: '/kitchen', icon: '👨‍🍳', color: '#22c55e' },
    { label: 'Billing', href: '/billing', icon: '💳', color: '#a855f7' },
    { label: 'Reports', href: '/reports', icon: '📊', color: '#06b6d4' },
    { label: 'Inventory', href: '/inventory', icon: '📦', color: '#ec4899' },
    { label: 'Reservations', href: '/reservations', icon: '📅', color: '#8b5cf6' },
    { label: 'Employees', href: '/employees', icon: '👤', color: '#14b8a6' },
  ],
  WAITER: [
    { label: 'Take Order', href: '/pos', icon: '🧾', color: '#f97316' },
    { label: 'Tables', href: '/tables', icon: '🪑', color: '#3b82f6' },
  ],
  CASHIER: [
    { label: 'Billing', href: '/billing', icon: '💳', color: '#a855f7' },
    { label: 'Orders', href: '/pos', icon: '🧾', color: '#f97316' },
  ],
  KITCHEN_STAFF: [
    { label: 'Kitchen Display', href: '/kitchen', icon: '👨‍🍳', color: '#22c55e' },
  ],
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#71717a' }}>
      Loading...
    </div>
  )

  if (!session) return null

  const role = session.user.role
  const shortcuts = roleRoutes[role] ?? roleRoutes.WAITER

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px', maxWidth: '900px', margin: '0 auto 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: '#f97316', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '22px',
          }}>🍽️</div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#fafafa' }}>RestoPOS</h1>
            <p style={{ fontSize: '12px', color: '#71717a' }}>{session.user.outletName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#fafafa' }}>{session.user.name}</p>
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
              background: '#27272a', color: '#f97316', fontWeight: '600',
            }}>{role}</span>
          </div>
          <button onClick={() => router.push('/profile')} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #3f3f46', background: 'transparent', color: '#a1a1aa', cursor: 'pointer', fontSize: '13px' }}>Profile</button>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid #3f3f46',
              background: 'transparent', color: '#a1a1aa', cursor: 'pointer', fontSize: '13px',
            }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Quick nav grid */}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '16px' }}>Quick access</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px',
        }}>
          {shortcuts.map((s) => (
            <button key={s.href} onClick={() => router.push(s.href)}
              style={{
                padding: '20px 16px', borderRadius: '14px',
                background: '#18181b', border: '1px solid #27272a',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s', color: '#fafafa',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = s.color; (e.currentTarget as HTMLElement).style.background = '#1c1c1e' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#27272a'; (e.currentTarget as HTMLElement).style.background = '#18181b' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{s.icon}</div>
              <p style={{ fontSize: '14px', fontWeight: '600' }}>{s.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
