'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const roleRoutes: Record<string, { label: string; href: string; icon: string; color: string }[]> = {
  SUPER_ADMIN: [
    { label: 'All Restaurants', href: '/superadmin', icon: '🏪', color: '#f97316' },
  ],
  ADMIN: [
    { label: 'Staff Chat', href: '/chat', icon: '💬', color: '#06b6d4' },
    { label: 'POS / Orders', href: '/pos', icon: '🧾', color: '#f97316' },
    { label: 'Tables', href: '/tables', icon: '🪑', color: '#3b82f6' },
    { label: 'Kitchen', href: '/kitchen', icon: '👨‍🍳', color: '#22c55e' },
    { label: 'Bar Display', href: '/bar', icon: '🍺', color: '#6366f1' },
    { label: 'Billing', href: '/billing', icon: '💳', color: '#a855f7' },
    { label: 'My Orders', href: '/my-orders', icon: '📋', color: '#06b6d4' },
    { label: 'Menu', href: '/menu', icon: '🍽️', color: '#f59e0b' },
    { label: 'Reports', href: '/reports', icon: '📊', color: '#06b6d4' },
    { label: 'Inventory', href: '/inventory', icon: '📦', color: '#ec4899' },
    { label: 'Customers', href: '/customers', icon: '👥', color: '#14b8a6' },
    { label: 'Employees', href: '/employees', icon: '👤', color: '#8b5cf6' },
    { label: 'Reservations', href: '/reservations', icon: '📅', color: '#f43f5e' },
    { label: 'Performance', href: '/performance', icon: '🏆', color: '#f59e0b' },
    { label: 'Users', href: '/users', icon: '🔑', color: '#64748b' },
    { label: 'Settings', href: '/settings', icon: '⚙️', color: '#71717a' },
  ],
  MANAGER: [
    { label: 'Staff Chat', href: '/chat', icon: '💬', color: '#06b6d4' },
    { label: 'POS / Orders', href: '/pos', icon: '🧾', color: '#f97316' },
    { label: 'Tables', href: '/tables', icon: '🪑', color: '#3b82f6' },
    { label: 'Kitchen', href: '/kitchen', icon: '👨‍🍳', color: '#22c55e' },
    { label: 'Bar Display', href: '/bar', icon: '🍺', color: '#6366f1' },
    { label: 'Billing', href: '/billing', icon: '💳', color: '#a855f7' },
    { label: 'My Orders', href: '/my-orders', icon: '📋', color: '#06b6d4' },
    { label: 'Menu', href: '/menu', icon: '🍽️', color: '#f59e0b' },
    { label: 'Reports', href: '/reports', icon: '📊', color: '#06b6d4' },
    { label: 'Inventory', href: '/inventory', icon: '📦', color: '#ec4899' },
    { label: 'Customers', href: '/customers', icon: '👥', color: '#14b8a6' },
    { label: 'Performance', href: '/performance', icon: '🏆', color: '#f59e0b' },
    { label: 'Settings', href: '/settings', icon: '⚙️', color: '#71717a' },
  ],
  CASHIER: [
    { label: 'Staff Chat', href: '/chat', icon: '💬', color: '#06b6d4' },
    { label: 'Billing', href: '/billing', icon: '💳', color: '#a855f7' },
    { label: 'My Orders', href: '/my-orders', icon: '📋', color: '#06b6d4' },
    { label: 'Take Order', href: '/pos', icon: '🧾', color: '#f97316' },
    { label: 'Customers', href: '/customers', icon: '👥', color: '#14b8a6' },
    { label: 'Reports', href: '/reports', icon: '📊', color: '#06b6d4' },
  ],
  WAITER: [
    { label: 'Staff Chat', href: '/chat', icon: '💬', color: '#06b6d4' },
    { label: 'Take Order', href: '/pos', icon: '🧾', color: '#f97316' },
    { label: 'My Orders', href: '/my-orders', icon: '📋', color: '#06b6d4' },
    { label: 'Tables', href: '/tables', icon: '🪑', color: '#3b82f6' },
    { label: 'Customers', href: '/customers', icon: '👥', color: '#14b8a6' },
  ],
  KITCHEN_STAFF: [
    { label: 'Staff Chat', href: '/chat', icon: '💬', color: '#06b6d4' },
    { label: 'Kitchen Display', href: '/kitchen', icon: '👨‍🍳', color: '#22c55e' },
  ],
  BAR_STAFF: [
    { label: 'Staff Chat', href: '/chat', icon: '💬', color: '#06b6d4' },
    { label: 'Bar Display', href: '/bar', icon: '🍺', color: '#6366f1' },
    { label: 'Take Order', href: '/pos', icon: '🧾', color: '#f97316' },
    { label: 'My Orders', href: '/my-orders', icon: '📋', color: '#06b6d4' },
    { label: 'Billing', href: '/billing', icon: '💰', color: '#22c55e' },
  ],
  DELIVERY_STAFF: [
    { label: 'My Orders', href: '/my-orders', icon: '📋', color: '#06b6d4' },
  ],
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#09090b', color: '#71717a', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '40px' }}>🍽️</div>
      <p>Loading...</p>
    </div>
  )

  if (!session) return null

  const role = session.user.role
  const routes = roleRoutes[role] ?? roleRoutes.WAITER
  const roleColors: Record<string,string> = { ADMIN:'#a855f7', MANAGER:'#3b82f6', SUPER_ADMIN:'#f97316', CASHIER:'#22c55e', WAITER:'#f97316', KITCHEN_STAFF:'#22c55e', BAR_STAFF:'#6366f1', DELIVERY_STAFF:'#f59e0b' }

  return (
    <div className="page-root">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderBottom:'1px solid #27272a', flexShrink:0, paddingTop:'max(10px, env(safe-area-inset-top))' }}>
        <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#f97316', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🍽️</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:'16px', fontWeight:'700', color:'#fafafa', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>RestoPOS</p>
          <p style={{ fontSize:'11px', color:'#71717a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.user.outletName ?? 'Restaurant'}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:'13px', fontWeight:'600', color:'#fafafa', margin:0 }}>{session.user.name}</p>
            <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'999px', background:(roleColors[role]+'22'), color:roleColors[role], fontWeight:'700' }}>{role.replace(/_/g,' ')}</span>
          </div>
          <button onClick={() => router.push('/profile')} style={{ padding:'7px 10px', borderRadius:'8px', border:'1px solid #3f3f46', background:'transparent', color:'#a1a1aa', cursor:'pointer', fontSize:'12px', whiteSpace:'nowrap' }}>Profile</button>
          <button onClick={() => signOut({ callbackUrl:'/login' })} style={{ padding:'7px 10px', borderRadius:'8px', border:'1px solid #3f3f46', background:'transparent', color:'#a1a1aa', cursor:'pointer', fontSize:'12px', whiteSpace:'nowrap' }}>Sign out</button>
        </div>
      </div>

      {/* Main content */}
      <div className="scroll-area">
        <div style={{ padding:'16px 14px 8px' }}>
          <p style={{ fontSize:'12px', color:'#52525b', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.05em' }}>Quick access</p>
        </div>

        {/* Route grid - responsive */}
        <div className="dashboard-grid" style={{ paddingTop:'8px' }}>
          {routes.map(s => (
            <button key={s.href} onClick={() => router.push(s.href)}
              style={{ padding:'16px 12px', borderRadius:'14px', background:'#18181b', border:'1px solid #27272a', cursor:'pointer', textAlign:'left', transition:'all 0.15s', color:'#fafafa', display:'flex', flexDirection:'column', gap:'8px', minHeight:'90px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = s.color; (e.currentTarget as HTMLElement).style.background = '#1f1f22' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#27272a'; (e.currentTarget as HTMLElement).style.background = '#18181b' }}>
              <span style={{ fontSize:'28px', lineHeight:1 }}>{s.icon}</span>
              <span style={{ fontSize:'13px', fontWeight:'600', color:'#fafafa', lineHeight:'1.3' }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', padding:'24px 16px', paddingBottom:'max(24px, env(safe-area-inset-bottom))' }}>
          <p style={{ fontSize:'11px', color:'#27272a' }}>Powered by Brycore · RestoPOS</p>
        </div>
      </div>
    </div>
  )
}
