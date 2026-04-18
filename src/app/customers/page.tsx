'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Customer {
  id: string; name: string; phone: string; email: string
  loyaltyPoints: number; totalSpent: number; totalVisits: number
  joinedAt: string; lastVisit: string; notes: string
}

const initCustomers: Customer[] = [
  { id: '1', name: 'Alice Nakato',    phone: '+256 701 234567', email: 'alice@email.com',   loyaltyPoints: 1240, totalSpent: 620000,  totalVisits: 18, joinedAt: '2024-01-15', lastVisit: '2025-04-10', notes: 'Prefers window seat' },
  { id: '2', name: 'Brian Ssempala', phone: '+256 772 345678', email: 'brian@email.com',   loyaltyPoints: 850,  totalSpent: 425000,  totalVisits: 12, joinedAt: '2024-03-22', lastVisit: '2025-04-14', notes: '' },
  { id: '3', name: 'Carol Apio',     phone: '+256 755 456789', email: '',                  loyaltyPoints: 320,  totalSpent: 160000,  totalVisits: 6,  joinedAt: '2024-06-01', lastVisit: '2025-03-28', notes: 'Vegetarian' },
  { id: '4', name: 'David Kato',     phone: '+256 700 567890', email: 'david@email.com',   loyaltyPoints: 2100, totalSpent: 1050000, totalVisits: 31, joinedAt: '2023-11-05', lastVisit: '2025-04-17', notes: 'VIP — complimentary drink' },
  { id: '5', name: 'Eva Namukasa',   phone: '+256 782 678901', email: 'eva@email.com',     loyaltyPoints: 500,  totalSpent: 250000,  totalVisits: 8,  joinedAt: '2024-09-10', lastVisit: '2025-04-05', notes: '' },
  { id: '6', name: 'Fred Oluya',     phone: '+256 756 789012', email: '',                  loyaltyPoints: 90,   totalSpent: 45000,   totalVisits: 2,  joinedAt: '2025-02-14', lastVisit: '2025-02-28', notes: '' },
]

const blank = () => ({ name:'', phone:'', email:'', notes:'' })

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState(initCustomers)
  const [selected, setSelected] = useState<Customer|null>(null)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(blank())

  const fmt = (n: number) => 'UGX ' + n.toLocaleString()
  const tier = (pts: number) => pts >= 2000 ? { label:'🥇 Gold', color:'#f59e0b' } : pts >= 500 ? { label:'🥈 Silver', color:'#a1a1aa' } : { label:'🥉 Bronze', color:'#c2783c' }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.phone.includes(q) ||
    c.email.toLowerCase().includes(q.toLowerCase())
  )

  const save = () => {
    if (!form.name || !form.phone) return
    setCustomers(x => [...x, {
      ...form, id: Date.now().toString(),
      loyaltyPoints: 0, totalSpent: 0, totalVisits: 0,
      joinedAt: new Date().toISOString().slice(0,10),
      lastVisit: new Date().toISOString().slice(0,10),
    }])
    setForm(blank()); setModal(false)
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.m, cursor: 'pointer', fontSize: '20px' }}>←</button>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: C.t, flex: 1 }}>👥 Customers</h1>
        <button onClick={() => setModal(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          + Add Customer
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', padding: '12px 20px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, overflowX: 'auto' }}>
        {[
          { label:'Total Customers', value: customers.length, color:'#3b82f6' },
          { label:'Gold Members', value: customers.filter(c => c.loyaltyPoints >= 2000).length, color:'#f59e0b' },
          { label:'Avg Spend', value: 'UGX ' + Math.round(customers.reduce((s,c)=>s+c.totalSpent,0)/customers.length).toLocaleString(), color:'#22c55e' },
        ].map(k => (
          <div key={k.label} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '10px', padding: '12px 18px', minWidth: '140px' }}>
            <p style={{ fontSize: '18px', fontWeight: '800', color: k.color }}>{k.value}</p>
            <p style={{ fontSize: '12px', color: C.m, marginTop: '3px' }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* List */}
        <div style={{ width: selected ? '340px' : '100%', display: 'flex', flexDirection: 'column', borderRight: selected ? `1px solid ${C.b}` : 'none', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, phone, email..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, fontSize: '13px', outline: 'none' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filtered.map(c => {
              const t = tier(c.loyaltyPoints)
              return (
                <div key={c.id} onClick={() => setSelected(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px', border: `1px solid ${selected?.id===c.id ? C.br : 'transparent'}`, background: selected?.id===c.id ? '#1a0f00' : 'transparent', transition: 'all 0.12s' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: C.br, flexShrink: 0 }}>
                    {c.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: C.t, fontWeight: '600', fontSize: '14px' }}>{c.name}</p>
                      <span style={{ fontSize: '11px', color: t.color }}>{t.label}</span>
                    </div>
                    <p style={{ color: C.m, fontSize: '12px', marginTop: '1px' }}>{c.phone}</p>
                    <p style={{ color: '#52525b', fontSize: '11px' }}>{c.totalVisits} visits · {fmt(c.totalSpent)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: C.br }}>
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ color: C.t, fontWeight: '700', fontSize: '20px' }}>{selected.name}</h2>
                  <span style={{ fontSize: '12px', color: tier(selected.loyaltyPoints).color }}>{tier(selected.loyaltyPoints).label} Member</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.m, cursor: 'pointer', fontSize: '22px' }}>×</button>
            </div>

            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { label:'Loyalty Points', value: selected.loyaltyPoints.toLocaleString() + ' pts', color:'#f59e0b' },
                { label:'Total Spent', value: fmt(selected.totalSpent), color:'#22c55e' },
                { label:'Total Visits', value: selected.totalVisits + ' visits', color:'#3b82f6' },
                { label:'Last Visit', value: selected.lastVisit, color:'#a1a1aa' },
              ].map(k => (
                <div key={k.label} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '10px', padding: '14px' }}>
                  <p style={{ fontSize: '16px', fontWeight: '800', color: k.color }}>{k.value}</p>
                  <p style={{ fontSize: '12px', color: C.m, marginTop: '3px' }}>{k.label}</p>
                </div>
              ))}
            </div>

            {/* Contact info */}
            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
              <p style={{ color: C.m, fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</p>
              {[
                { label: 'Phone', value: selected.phone },
                { label: 'Email', value: selected.email || '—' },
                { label: 'Member since', value: selected.joinedAt },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: C.m, fontSize: '13px' }}>{r.label}</span>
                  <span style={{ color: C.t, fontSize: '13px', fontWeight: '500' }}>{r.value}</span>
                </div>
              ))}
            </div>

            {selected.notes && (
              <div style={{ background: '#1a0f00', border: `1px solid #3f1f00`, borderRadius: '10px', padding: '12px 14px' }}>
                <p style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '4px' }}>📝 Notes</p>
                <p style={{ color: C.t, fontSize: '13px' }}>{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModal(false)}>
          <div style={{ background: '#1c1c1e', border: `1px solid ${C.b}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '20px' }}>New Customer</h2>
            {[
              { label:'Full Name *', k:'name', ph:'e.g. Jane Namutebi' },
              { label:'Phone *', k:'phone', ph:'+256 7XX XXXXXX' },
              { label:'Email', k:'email', ph:'optional@email.com' },
              { label:'Notes', k:'notes', ph:'Any preferences or notes' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>{f.label}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm(x => ({ ...x, [f.k]: e.target.value }))} placeholder={f.ph}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.b}`, background: 'transparent', color: C.m, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: C.br, color: 'white', cursor: 'pointer', fontWeight: '700' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
