'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const ALL_MODULES: Record<string, { label: string; icon: string; desc: string }> = {
  pos:          { label: 'POS / Take Orders',     icon: '🧾', desc: 'Order taking interface' },
  kitchen:      { label: 'Kitchen Display',       icon: '👨‍🍳', desc: 'Chef order screen' },
  bar:          { label: 'Bar Display',           icon: '🍺', desc: 'Drinks counter screen' },
  billing:      { label: 'Billing & Payments',    icon: '💰', desc: 'Process payments' },
  tables:       { label: 'Table Management',      icon: '🪑', desc: 'Floor plan and tables' },
  menu:         { label: 'Menu Management',       icon: '📋', desc: 'Add/edit menu items' },
  inventory:    { label: 'Inventory & Stock',     icon: '📦', desc: 'Stock tracking' },
  customers:    { label: 'Customer Database',     icon: '👥', desc: 'CRM with loyalty' },
  reservations: { label: 'Reservations',          icon: '📅', desc: 'Table bookings' },
  employees:    { label: 'Employee Management',   icon: '👤', desc: 'Staff & payroll' },
  reports:      { label: 'Reports & Analytics',   icon: '📊', desc: 'Sales reports' },
  performance:  { label: 'Staff Performance',     icon: '🏆', desc: 'Leaderboards' },
  chat:         { label: 'Staff Chat',            icon: '💬', desc: 'Internal messaging' },
  loyalty:      { label: 'Loyalty Program',       icon: '⭐', desc: 'Customer rewards' },
  delivery:     { label: 'Delivery Management',   icon: '🛵', desc: 'Order delivery tracking' },
  ura:          { label: 'URA EFRIS Integration', icon: '🏛️', desc: 'Tax compliance' },
}

const PLAN_DEFAULTS: Record<string, string[]> = {
  BASIC:      ['pos','kitchen','billing','tables','menu','reports'],
  PRO:        ['pos','kitchen','bar','billing','tables','menu','inventory','customers','employees','reports','performance','chat'],
  ENTERPRISE: Object.keys(ALL_MODULES),
}

interface Outlet {
  id: string; name: string; address?: string; phone?: string; email?: string
  currency: string; plan: string; modules: string[] | null; isActive: boolean
  maxStaff: number; maxOrders: number; expiresAt?: string
  todayOrders: number; todayRevenue: number
  _count: { users: number; orders: number }
}

interface SystemData {
  overview: {
    totalOutlets: number; activeOutlets: number; totalUsers: number
    totalOrders: number; todayOrders: number
    todayRevenue: number; weekRevenue: number; monthRevenue: number
    criticalLogs: number; errorLogs: number; recentOrdersHourly: number
  }
  health: { status: string; databaseConnected: boolean }
  perOutlet: { id: string; name: string; plan: string; orders24h: number; lastOrderMinAgo: number | null; status: string }[]
  recentLogs: { id: string; level: string; category: string; message: string; createdAt: string; outletId?: string }[]
}

export default function SuperAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'overview'|'restaurants'|'logs'>('overview')
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [systemData, setSystemData] = useState<SystemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Outlet | null>(null)
  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)

  const blank = () => ({
    name: '', address: '', phone: '', email: '', currency: 'UGX',
    plan: 'BASIC', modules: PLAN_DEFAULTS.BASIC,
    adminName: '', adminEmail: '', adminPin: '', adminPassword: '',
    expiresAt: '', maxStaff: 10, maxOrders: 1000,
  })
  const [form, setForm] = useState(blank())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user.role !== 'SUPER_ADMIN') router.push('/dashboard')
  }, [status, session, router])

  const showToast = (msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(''), 3500) }
  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()

  const fetchAll = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([
        fetch('/api/superadmin/outlets').then(r => r.json()),
        fetch('/api/superadmin/system').then(r => r.json()),
      ])
      if (Array.isArray(o)) setOutlets(o)
      if (s && !s.error) setSystemData(s)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Refresh system data every 30s
  useEffect(() => {
    if (tab !== 'overview') return
    const i = setInterval(() => {
      if (!document.hidden) {
        fetch('/api/superadmin/system').then(r => r.json()).then(s => { if (s && !s.error) setSystemData(s) })
      }
    }, 30000)
    return () => clearInterval(i)
  }, [tab])

  const onPlanChange = (newPlan: string) => {
    setForm(f => ({ ...f, plan: newPlan, modules: PLAN_DEFAULTS[newPlan] ?? PLAN_DEFAULTS.BASIC }))
  }

  const toggleModule = (mod: string) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(mod) ? f.modules.filter(m => m !== mod) : [...f.modules, mod],
    }))
  }

  const create = async () => {
    if (!form.name || !form.adminName || !form.adminPin) {
      showToast('❌ Name, admin name and PIN required', false); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/outlets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`✅ Restaurant "${data.name}" created!`)
        setShowCreate(false); setForm(blank()); fetchAll()
      } else showToast('❌ ' + (data.error ?? 'Failed'), false)
    } catch { showToast('❌ Error creating restaurant', false) }
    setSaving(false)
  }

  const update = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/superadmin/outlets/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editing.name, address: editing.address, phone: editing.phone, email: editing.email,
          currency: editing.currency, plan: editing.plan, modules: editing.modules,
          maxStaff: editing.maxStaff, maxOrders: editing.maxOrders, isActive: editing.isActive,
        }),
      })
      if (res.ok) { showToast('✅ Updated'); setEditing(null); fetchAll() }
      else showToast('❌ Failed', false)
    } catch { showToast('❌ Error', false) }
    setSaving(false)
  }

  const toggleActive = async (outlet: Outlet) => {
    try {
      const res = await fetch(`/api/superadmin/outlets/${outlet.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !outlet.isActive }),
      })
      if (res.ok) { showToast(outlet.isActive ? '⏸️ Suspended' : '▶️ Activated'); fetchAll() }
    } catch {}
  }

  const C = { bg: '#09090b', s: '#18181b', b: '#27272a', t: '#fafafa', m: '#71717a', br: '#f97316' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }

  const planColor = (p: string) => p === 'ENTERPRISE' ? '#a855f7' : p === 'PRO' ? '#3b82f6' : '#71717a'

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: C.bg, color: C.m }}>Loading control center...</div>

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      {toast && <div style={{ position: 'fixed', top: 'max(12px,env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toastOk ? '#14532d' : '#450a0a', border: `1px solid ${toastOk ? '#22c55e' : '#7f1d1d'}`, borderRadius: '10px', padding: '12px 24px', color: toastOk ? '#22c55e' : '#fca5a5', fontWeight: '600', fontSize: '14px' }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, paddingTop: 'max(12px,env(safe-area-inset-top))' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: C.br, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏪</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '17px', fontWeight: '800', color: C.t, margin: 0 }}>Super Admin Control</h1>
          <p style={{ fontSize: '11px', color: C.m, margin: 0 }}>Brycore · {session?.user.name}</p>
        </div>
        {systemData && <div style={{ padding: '5px 10px', borderRadius: '999px', background: systemData.health.status === 'HEALTHY' ? '#052e16' : systemData.health.status === 'WARNING' ? '#1c1200' : '#450a0a', border: `1px solid ${systemData.health.status === 'HEALTHY' ? '#22c55e' : systemData.health.status === 'WARNING' ? '#f59e0b' : '#ef4444'}`, color: systemData.health.status === 'HEALTHY' ? '#22c55e' : systemData.health.status === 'WARNING' ? '#f59e0b' : '#ef4444', fontSize: '11px', fontWeight: '700' }}>
          ● {systemData.health.status}
        </div>}
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${C.b}`, background: 'transparent', color: C.m, cursor: 'pointer', fontSize: '12px' }}>Sign out</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.b}`, flexShrink: 0, overflowX: 'auto' }}>
        {([['overview','📊 Overview'],['restaurants','🏪 Restaurants'],['logs','📋 Logs']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding: '11px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === v ? C.br : 'transparent'}`, color: tab === v ? C.br : C.m, cursor: 'pointer', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap' }}>{l}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '16px' }}>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && systemData && (
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Critical alerts */}
            {systemData.overview.criticalLogs > 0 && (
              <div style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px' }}>🚨</div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#ef4444', fontWeight: '800', margin: 0 }}>{systemData.overview.criticalLogs} critical issue(s) in last 7 days</p>
                  <p style={{ color: '#fca5a5', fontSize: '12px', margin: 0 }}>Check system logs for details</p>
                </div>
                <button onClick={() => setTab('logs')} style={{ padding: '7px 14px', borderRadius: '8px', background: '#7f1d1d', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>View Logs</button>
              </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Active Restaurants', value: systemData.overview.activeOutlets, total: systemData.overview.totalOutlets, color: '#22c55e', icon: '🏪' },
                { label: 'Total Users', value: systemData.overview.totalUsers, color: '#3b82f6', icon: '👥' },
                { label: 'Today Orders', value: systemData.overview.todayOrders, color: '#f97316', icon: '📋' },
                { label: 'Last Hour Orders', value: systemData.overview.recentOrdersHourly, color: '#06b6d4', icon: '⏱️' },
                { label: 'Today Revenue', value: fmt(systemData.overview.todayRevenue), color: '#22c55e', icon: '💰' },
                { label: 'Week Revenue', value: fmt(systemData.overview.weekRevenue), color: '#3b82f6', icon: '📈' },
                { label: 'Month Revenue', value: fmt(systemData.overview.monthRevenue), color: '#a855f7', icon: '📊' },
                { label: 'Errors (7d)', value: systemData.overview.errorLogs, color: systemData.overview.errorLogs > 5 ? '#ef4444' : C.m, icon: '⚠️' },
              ].map(k => (
                <div key={k.label} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: C.m, fontWeight: '600', textTransform: 'uppercase' }}>{k.label}</span>
                    <span style={{ fontSize: '14px' }}>{k.icon}</span>
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: k.color, margin: 0 }}>
                    {k.value}{k.total !== undefined ? <span style={{ fontSize: '13px', color: C.m, fontWeight: '500' }}> / {k.total}</span> : ''}
                  </p>
                </div>
              ))}
            </div>

            {/* Per outlet activity */}
            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ color: C.t, fontWeight: '700', margin: '0 0 12px', fontSize: '15px' }}>📍 Restaurant Activity</h3>
              {systemData.perOutlet.length === 0 ? <p style={{ color: C.m, fontSize: '13px' }}>No active restaurants</p> :
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {systemData.perOutlet.map(o => (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: '#0f0f10' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: o.status === 'active' ? '#22c55e' : o.status === 'idle' ? '#f59e0b' : '#71717a' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: C.t, fontWeight: '600', fontSize: '13px', margin: 0 }}>{o.name}</p>
                        <p style={{ color: C.m, fontSize: '11px', margin: 0 }}>
                          <span style={{ color: planColor(o.plan), fontWeight: '700' }}>{o.plan}</span> ·
                          {o.orders24h} orders today ·
                          {o.lastOrderMinAgo === null ? ' Never used' : o.lastOrderMinAgo < 60 ? ` Active ${o.lastOrderMinAgo}m ago` : ` Last seen ${Math.floor(o.lastOrderMinAgo / 60)}h ago`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>

            {/* Recent activity log */}
            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '16px' }}>
              <h3 style={{ color: C.t, fontWeight: '700', margin: '0 0 12px', fontSize: '15px' }}>🕐 Recent Activity</h3>
              {systemData.recentLogs.length === 0 ? <p style={{ color: C.m, fontSize: '13px' }}>No recent activity</p> :
                systemData.recentLogs.slice(0, 8).map(log => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: `1px solid ${C.b}` }}>
                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: log.level === 'CRITICAL' ? '#450a0a' : log.level === 'ERROR' ? '#1c1200' : log.level === 'WARN' ? '#1c1200' : '#0f172a', color: log.level === 'CRITICAL' ? '#ef4444' : log.level === 'ERROR' ? '#ef4444' : log.level === 'WARN' ? '#f59e0b' : '#3b82f6', fontWeight: '700', flexShrink: 0 }}>{log.level}</span>
                    <p style={{ color: C.t, fontSize: '12px', margin: 0, flex: 1 }}>{log.message}</p>
                    <span style={{ color: C.m, fontSize: '10px', flexShrink: 0 }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* RESTAURANTS TAB */}
        {tab === 'restaurants' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p style={{ color: C.m, fontSize: '13px', margin: 0 }}>{outlets.length} restaurants total</p>
              <button onClick={() => { setForm(blank()); setShowCreate(true) }} style={{ padding: '9px 16px', borderRadius: '10px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>+ Add Restaurant</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {outlets.map(o => (
                <div key={o.id} style={{ background: C.s, border: `1px solid ${o.isActive ? C.b : '#7f1d1d'}`, borderRadius: '12px', padding: '14px', opacity: o.isActive ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: C.t, fontWeight: '700', fontSize: '15px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</p>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: planColor(o.plan) + '22', color: planColor(o.plan), fontWeight: '700' }}>{o.plan}</span>
                      {!o.isActive && <span style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#7f1d1d22', color: '#ef4444', fontWeight: '700' }}>SUSPENDED</span>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    <div><p style={{ fontSize: '10px', color: C.m, margin: 0 }}>Today Orders</p><p style={{ fontSize: '15px', fontWeight: '700', color: C.t, margin: 0 }}>{o.todayOrders}</p></div>
                    <div><p style={{ fontSize: '10px', color: C.m, margin: 0 }}>Today Revenue</p><p style={{ fontSize: '15px', fontWeight: '700', color: C.br, margin: 0 }}>{fmt(o.todayRevenue)}</p></div>
                    <div><p style={{ fontSize: '10px', color: C.m, margin: 0 }}>Staff</p><p style={{ fontSize: '13px', color: C.t, margin: 0 }}>{o._count.users} / {o.maxStaff}</p></div>
                    <div><p style={{ fontSize: '10px', color: C.m, margin: 0 }}>Modules</p><p style={{ fontSize: '13px', color: C.t, margin: 0 }}>{o.modules?.length ?? 'all'}</p></div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setEditing(o)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: `1px solid ${C.b}`, background: 'transparent', color: C.t, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>⚙️ Manage</button>
                    <button onClick={() => toggleActive(o)} style={{ padding: '7px 12px', borderRadius: '7px', border: `1px solid ${o.isActive ? '#7f1d1d' : '#14532d'}`, background: 'transparent', color: o.isActive ? '#ef4444' : '#22c55e', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>{o.isActive ? 'Suspend' : 'Activate'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === 'logs' && systemData && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h3 style={{ color: C.t, fontWeight: '700', marginBottom: '14px' }}>📋 System Logs</h3>
            {systemData.recentLogs.map(log => (
              <div key={log.id} style={{ background: C.s, border: `1px solid ${log.level === 'CRITICAL' ? '#7f1d1d' : C.b}`, borderRadius: '10px', padding: '10px 12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: log.level === 'CRITICAL' ? '#7f1d1d' : log.level === 'ERROR' ? '#450a0a' : log.level === 'WARN' ? '#1c1200' : '#0f172a', color: log.level === 'CRITICAL' ? 'white' : log.level === 'ERROR' ? '#ef4444' : log.level === 'WARN' ? '#f59e0b' : '#3b82f6', fontWeight: '700' }}>{log.level}</span>
                  <span style={{ fontSize: '10px', color: C.m, fontWeight: '600' }}>{log.category}</span>
                  <span style={{ fontSize: '10px', color: C.m, marginLeft: 'auto' }}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ color: C.t, fontSize: '13px', margin: 0 }}>{log.message}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: '60px' }} />
      </div>

      {/* CREATE RESTAURANT MODAL */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#1c1c1e', borderTop: `1px solid ${C.b}`, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '20px 16px', paddingBottom: 'max(20px,env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '16px', fontSize: '17px' }}>+ Add New Restaurant</h2>

            <p style={{ color: C.br, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Restaurant Info</p>
            <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Restaurant Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cuvette Bar & Grill" style={inputStyle} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div><label style={labelStyle}>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+256..." style={inputStyle} /></div>
              <div><label style={labelStyle}>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@..." style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Kampala, Uganda" style={inputStyle} /></div>

            <p style={{ color: C.br, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Subscription Plan</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {['BASIC', 'PRO', 'ENTERPRISE'].map(p => (
                <button key={p} onClick={() => onPlanChange(p)} style={{ padding: '10px', borderRadius: '8px', border: `2px solid ${form.plan === p ? planColor(p) : C.b}`, background: form.plan === p ? planColor(p) + '22' : 'transparent', color: form.plan === p ? planColor(p) : C.m, cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
                  {p}<br /><span style={{ fontSize: '9px', fontWeight: '500' }}>{PLAN_DEFAULTS[p].length} modules</span>
                </button>
              ))}
            </div>

            <p style={{ color: C.br, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Modules ({form.modules.length} enabled)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', marginBottom: '14px' }}>
              {Object.entries(ALL_MODULES).map(([key, mod]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px', borderRadius: '8px', background: form.modules.includes(key) ? '#1a0f00' : '#27272a', border: `1px solid ${form.modules.includes(key) ? C.br : C.b}`, cursor: 'pointer', fontSize: '12px' }}>
                  <input type="checkbox" checked={form.modules.includes(key)} onChange={() => toggleModule(key)} style={{ display: 'none' }} />
                  <span style={{ fontSize: '14px' }}>{mod.icon}</span>
                  <span style={{ color: form.modules.includes(key) ? C.t : C.m, fontWeight: '600', fontSize: '11px' }}>{mod.label}</span>
                  {form.modules.includes(key) && <span style={{ marginLeft: 'auto', color: C.br, fontWeight: '800' }}>✓</span>}
                </label>
              ))}
            </div>

            <p style={{ color: C.br, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Limits</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div><label style={labelStyle}>Max Staff</label><input type="number" value={form.maxStaff} onChange={e => setForm(f => ({ ...f, maxStaff: Number(e.target.value) }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Max Orders/mo</label><input type="number" value={form.maxOrders} onChange={e => setForm(f => ({ ...f, maxOrders: Number(e.target.value) }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Expires</label><input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} style={inputStyle} /></div>
            </div>

            <p style={{ color: C.br, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Restaurant Admin Account</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div><label style={labelStyle}>Admin Name *</label><input value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))} placeholder="John Doe" style={inputStyle} /></div>
              <div><label style={labelStyle}>Admin PIN *</label><input value={form.adminPin} onChange={e => setForm(f => ({ ...f, adminPin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="4-6 digits" inputMode="numeric" style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div><label style={labelStyle}>Admin Email</label><input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder="optional" style={inputStyle} /></div>
              <div><label style={labelStyle}>Password</label><input type="text" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder="(uses PIN if empty)" style={inputStyle} /></div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${C.b}`, background: 'transparent', color: C.m, cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={create} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700', opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating...' : `Create Restaurant`}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RESTAURANT MODAL */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setEditing(null)}>
          <div style={{ background: '#1c1c1e', borderTop: `1px solid ${C.b}`, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '20px 16px', paddingBottom: 'max(20px,env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '16px', fontSize: '17px' }}>⚙️ Manage — {editing.name}</h2>

            <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Name</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inputStyle} /></div>

            <p style={{ color: C.br, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', marginTop: '14px' }}>Plan</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {['BASIC', 'PRO', 'ENTERPRISE'].map(p => (
                <button key={p} onClick={() => setEditing({ ...editing, plan: p, modules: PLAN_DEFAULTS[p] })} style={{ padding: '10px', borderRadius: '8px', border: `2px solid ${editing.plan === p ? planColor(p) : C.b}`, background: editing.plan === p ? planColor(p) + '22' : 'transparent', color: editing.plan === p ? planColor(p) : C.m, cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>{p}</button>
              ))}
            </div>

            <p style={{ color: C.br, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Modules ({editing.modules?.length ?? 0} enabled)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', marginBottom: '14px' }}>
              {Object.entries(ALL_MODULES).map(([key, mod]) => {
                const enabled = (editing.modules ?? []).includes(key)
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px', borderRadius: '8px', background: enabled ? '#1a0f00' : '#27272a', border: `1px solid ${enabled ? C.br : C.b}`, cursor: 'pointer' }}>
                    <input type="checkbox" checked={enabled} onChange={() => {
                      const cur = editing.modules ?? []
                      setEditing({ ...editing, modules: enabled ? cur.filter(m => m !== key) : [...cur, key] })
                    }} style={{ display: 'none' }} />
                    <span style={{ fontSize: '14px' }}>{mod.icon}</span>
                    <span style={{ color: enabled ? C.t : C.m, fontWeight: '600', fontSize: '11px' }}>{mod.label}</span>
                    {enabled && <span style={{ marginLeft: 'auto', color: C.br, fontWeight: '800' }}>✓</span>}
                  </label>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div><label style={labelStyle}>Max Staff</label><input type="number" value={editing.maxStaff} onChange={e => setEditing({ ...editing, maxStaff: Number(e.target.value) })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Max Orders/mo</label><input type="number" value={editing.maxOrders} onChange={e => setEditing({ ...editing, maxOrders: Number(e.target.value) })} style={inputStyle} /></div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${C.b}`, background: 'transparent', color: C.m, cursor: 'pointer' }}>Cancel</button>
              <button onClick={update} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
