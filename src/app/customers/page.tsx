'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Customer { id: string; name: string; phone: string; email: string; loyaltyPoints: number; totalSpent: number; totalVisits: number; createdAt: string; notes?: string }

const tier = (pts: number) => pts >= 2000 ? { label:'🥇 Gold', color:'#f59e0b' } : pts >= 500 ? { label:'🥈 Silver', color:'#a1a1aa' } : { label:'🥉 Bronze', color:'#c2783c' }

export default function CustomersPage() {
  const { status } = useSession()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Customer|null>(null)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', email:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchCustomers = useCallback(async (search = '') => {
    try {
      const res = await fetch(`/api/customers${search ? `?q=${search}` : ''}`)
      if (res.ok) { const data = await res.json(); setCustomers(Array.isArray(data) ? data : []) }
    } catch { console.error('Failed to fetch customers') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(q), 400)
    return () => clearTimeout(t)
  }, [q, fetchCustomers])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const fmt = (n: number) => 'UGX ' + n.toLocaleString()

  const save = async () => {
    if (!form.name || !form.phone) return
    setSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const customer = await res.json()
        setCustomers(c => [customer, ...c])
        setForm({ name:'', phone:'', email:'', notes:'' })
        setModal(false)
        showToast('✅ Customer added')
      } else {
        const err = await res.json()
        showToast('❌ ' + err.error)
      }
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading customers...</div>

  return (
    <div className="page-root">
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>👥 Customers</h1>
        <button onClick={() => setModal(true)} style={{ padding:'8px 16px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>+ Add Customer</button>
      </div>

      <div style={{ display:'flex', gap:'12px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
        {[{label:'Total',value:customers.length,color:'#3b82f6'},{label:'Gold',value:customers.filter(c=>c.loyaltyPoints>=2000).length,color:'#f59e0b'},{label:'Avg Spend',value:'UGX '+Math.round((customers.reduce((s,c)=>s+c.totalSpent,0)/Math.max(1,customers.length))).toLocaleString(),color:'#22c55e'}].map(k => (
          <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'10px 18px', minWidth:'130px' }}>
            <p style={{ fontSize:'18px', fontWeight:'800', color:k.color }}>{k.value}</p>
            <p style={{ fontSize:'12px', color:C.m, marginTop:'3px' }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <div style={{ width:selected ? '340px' : '100%', display:'flex', flexDirection:'column', borderRight:selected ? `1px solid ${C.b}` : 'none', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, phone, email..." style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }} />
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
            {customers.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#52525b' }}>
                <p style={{ fontSize:'32px', marginBottom:'10px' }}>👥</p>
                <p>No customers yet</p>
                <p style={{ fontSize:'12px', marginTop:'4px' }}>Customers are added when taking orders</p>
              </div>
            ) : customers.map(c => {
              const t = tier(c.loyaltyPoints)
              return (
                <div key={c.id} onClick={() => setSelected(c)} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', borderRadius:'10px', cursor:'pointer', marginBottom:'4px', border:`1px solid ${selected?.id===c.id ? C.br : 'transparent'}`, background:selected?.id===c.id ? '#1a0f00' : 'transparent', transition:'all 0.12s' }}>
                  <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:C.br, flexShrink:0 }}>{c.name.charAt(0)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <p style={{ color:C.t, fontWeight:'600', fontSize:'14px' }}>{c.name}</p>
                      <span style={{ fontSize:'11px', color:t.color }}>{t.label}</span>
                    </div>
                    <p style={{ color:C.m, fontSize:'12px' }}>{c.phone}</p>
                    <p style={{ color:'#52525b', fontSize:'11px' }}>{c.totalVisits} visits · {fmt(c.totalSpent)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selected && (
          <div className="scroll-area" style={{ padding: "16px" }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'700', color:C.br }}>{selected.name.charAt(0)}</div>
                <div>
                  <h2 style={{ color:C.t, fontWeight:'700', fontSize:'20px' }}>{selected.name}</h2>
                  <span style={{ fontSize:'12px', color:tier(selected.loyaltyPoints).color }}>{tier(selected.loyaltyPoints).label} Member</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'22px' }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
              {[{label:'Loyalty Points',value:selected.loyaltyPoints.toLocaleString()+' pts',color:'#f59e0b'},{label:'Total Spent',value:fmt(selected.totalSpent),color:'#22c55e'},{label:'Total Visits',value:selected.totalVisits+' visits',color:'#3b82f6'},{label:'Member Since',value:new Date(selected.createdAt).toLocaleDateString(),color:'#a1a1aa'}].map(k => (
                <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'14px' }}>
                  <p style={{ fontSize:'16px', fontWeight:'800', color:k.color }}>{k.value}</p>
                  <p style={{ fontSize:'12px', color:C.m, marginTop:'3px' }}>{k.label}</p>
                </div>
              ))}
            </div>
            <div style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'12px', padding:'16px' }}>
              {[{label:'Phone',value:selected.phone},{label:'Email',value:selected.email||'—'}].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                  <span style={{ color:C.m, fontSize:'13px' }}>{r.label}</span>
                  <span style={{ color:C.t, fontSize:'13px', fontWeight:'500' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(false)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'380px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'20px' }}>New Customer</h2>
            {[{label:'Full Name *',k:'name',ph:'e.g. Jane Namutebi'},{label:'Phone *',k:'phone',ph:'+256 7XX XXXXXX'},{label:'Email',k:'email',ph:'optional@email.com'}].map(f => (
              <div key={f.k} style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>{f.label}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm(x => ({ ...x, [f.k]: e.target.value }))} placeholder={f.ph} style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            ))}
            <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
