'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface OutletStats {
  id: string; name: string; address: string; phone: string; currency: string; isActive: boolean; createdAt: string
  _count: { users: number; orders: number }
}

export default function SuperAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [outlets, setOutlets] = useState<OutletStats[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', address:'', phone:'', currency:'UGX', adminName:'', adminEmail:'', adminPin:'', adminPassword:'' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && session?.user.role !== 'SUPER_ADMIN') { router.push('/dashboard'); return }
  }, [status, session])

  useEffect(() => {
    fetch('/api/superadmin/outlets')
      .then(r => r.json())
      .then(data => { setOutlets(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const createOutlet = async () => {
    if (!form.name || !form.adminName || !form.adminPin) { showToast('❌ Restaurant name, admin name and PIN required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/outlets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setOutlets(o => [...o, data.outlet])
        setForm({ name:'', address:'', phone:'', currency:'UGX', adminName:'', adminEmail:'', adminPin:'', adminPassword:'' })
        setModal(false)
        showToast(`✅ ${form.name} created! Admin PIN: ${form.adminPin}`)
      } else showToast('❌ ' + data.error)
    } catch { showToast('❌ Error creating outlet') }
    setSaving(false)
  }

  const toggleOutlet = async (id: string, isActive: boolean) => {
    try {
      await fetch('/api/superadmin/outlets', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, isActive: !isActive }) })
      setOutlets(o => o.map(x => x.id === id ? { ...x, isActive: !isActive } : x))
      showToast(isActive ? 'Outlet deactivated' : 'Outlet reactivated')
    } catch { showToast('❌ Error') }
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, color:C.m }}>Loading...</div>

  return (
    <div className="page-root">
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:C.br, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🍽️</div>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t }}>RestoPOS — Super Admin</h1>
          <p style={{ fontSize:'12px', color:C.m }}>Managing all restaurants · {session?.user.name}</p>
        </div>
        <button onClick={() => setModal(true)} style={{ padding:'8px 16px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>
          + New Restaurant
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        {[
          { label:'Total Restaurants', value:outlets.length, color:'#3b82f6' },
          { label:'Active', value:outlets.filter(o=>o.isActive).length, color:'#22c55e' },
          { label:'Total Staff', value:outlets.reduce((s,o)=>s+(o._count?.users??0),0), color:'#f97316' },
          { label:'Total Orders', value:outlets.reduce((s,o)=>s+(o._count?.orders??0),0), color:'#a855f7' },
        ].map(k => (
          <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'10px 18px', minWidth:'130px' }}>
            <p style={{ fontSize:'22px', fontWeight:'800', color:k.color }}>{k.value}</p>
            <p style={{ fontSize:'11px', color:C.m }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Outlets list */}
      <div className="scroll-area" style={{ padding: "16px" }}>
        {outlets.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#52525b' }}>
            <p style={{ fontSize:'48px', marginBottom:'12px' }}>🏪</p>
            <p style={{ fontSize:'16px', color:C.m }}>No restaurants yet</p>
            <button onClick={() => setModal(true)} style={{ marginTop:'16px', padding:'10px 24px', borderRadius:'10px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600' }}>Add First Restaurant</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'14px' }}>
            {outlets.map(outlet => (
              <div key={outlet.id} style={{ background:C.s, border:`1px solid ${outlet.isActive ? C.b : '#450a0a'}`, borderRadius:'14px', padding:'18px', opacity:outlet.isActive ? 1 : 0.6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                  <div>
                    <p style={{ color:C.t, fontWeight:'700', fontSize:'16px', marginBottom:'4px' }}>{outlet.name}</p>
                    <p style={{ color:C.m, fontSize:'12px' }}>{outlet.address || 'No address set'}</p>
                    <p style={{ color:C.m, fontSize:'12px' }}>{outlet.phone || 'No phone'}</p>
                  </div>
                  <span style={{ fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'999px', background:outlet.isActive?'#14532d':'#450a0a', color:outlet.isActive?'#22c55e':'#ef4444' }}>
                    {outlet.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ display:'flex', gap:'16px', marginBottom:'14px' }}>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontSize:'18px', fontWeight:'700', color:C.br }}>{outlet._count?.users ?? 0}</p>
                    <p style={{ fontSize:'11px', color:C.m }}>Staff</p>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontSize:'18px', fontWeight:'700', color:'#3b82f6' }}>{outlet._count?.orders ?? 0}</p>
                    <p style={{ fontSize:'11px', color:C.m }}>Orders</p>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontSize:'14px', fontWeight:'700', color:C.m }}>{outlet.currency}</p>
                    <p style={{ fontSize:'11px', color:C.m }}>Currency</p>
                  </div>
                </div>

                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => toggleOutlet(outlet.id, outlet.isActive)}
                    style={{ flex:1, padding:'8px', borderRadius:'8px', border:`1px solid ${outlet.isActive?'#78350f':'#14532d'}`, background:'transparent', color:outlet.isActive?'#f59e0b':'#22c55e', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
                    {outlet.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button onClick={() => window.open(`/dashboard?outlet=${outlet.id}`, '_blank')}
                    style={{ flex:1, padding:'8px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer', fontSize:'12px' }}>
                    View Dashboard ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Outlet Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', overflowY:'auto' }} onClick={() => setModal(false)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'460px', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'20px' }}>🏪 New Restaurant</h2>

            <p style={{ color:C.br, fontSize:'12px', fontWeight:'600', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Restaurant Details</p>
            {[
              { label:'Restaurant / Bar Name *', k:'name', ph:'e.g. Cuvette Bar & Grill' },
              { label:'Address', k:'address', ph:'Kampala, Uganda' },
              { label:'Phone', k:'phone', ph:'+256 700 000000' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>{f.label}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm(x=>({...x,[f.k]:e.target.value}))} placeholder={f.ph}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            ))}
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>Currency</label>
              <select value={form.currency} onChange={e => setForm(x=>({...x,currency:e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }}>
                {['UGX','KES','TZS','USD','EUR','GBP','ZAR'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <p style={{ color:C.br, fontSize:'12px', fontWeight:'600', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Admin Account</p>
            {[
              { label:'Admin Full Name *', k:'adminName', ph:'e.g. John Manager' },
              { label:'Admin Email', k:'adminEmail', ph:'admin@restaurant.com' },
              { label:'Admin PIN * (4-6 digits)', k:'adminPin', ph:'e.g. 9999' },
              { label:'Admin Password', k:'adminPassword', ph:'Min 6 characters' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>{f.label}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm(x=>({...x,[f.k]:e.target.value}))} placeholder={f.ph}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            ))}

            <div style={{ background:'#1a0f00', border:'1px solid #3f1f00', borderRadius:'8px', padding:'10px 14px', marginBottom:'20px', fontSize:'12px', color:'#f59e0b' }}>
              💡 Each restaurant gets its own isolated data — menus, staff, orders, and reports are completely separate.
            </div>

            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={createOutlet} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Creating...' : 'Create Restaurant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
