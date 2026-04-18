'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface User { id: string; name: string; email: string; pin: string; role: string; isActive: boolean; createdAt: string }

const roleColors: Record<string,string> = {
  ADMIN:'#a855f7', MANAGER:'#3b82f6', CASHIER:'#22c55e',
  WAITER:'#f97316', KITCHEN_STAFF:'#ef4444', DELIVERY_STAFF:'#f59e0b',
}
const roles = ['ADMIN','MANAGER','CASHIER','WAITER','KITCHEN_STAFF','DELIVERY_STAFF']
const roleDesc: Record<string,string> = {
  ADMIN:'Full system access — all modules, settings, reports',
  MANAGER:'All operations, reports, inventory — no system settings',
  CASHIER:'Billing, payment processing, view orders',
  WAITER:'Take orders, manage tables, view menu',
  KITCHEN_STAFF:'View and manage kitchen display (KDS) only',
  DELIVERY_STAFF:'View and manage delivery orders only',
}

const blank = () => ({ name:'', email:'', pin:'', role:'WAITER', password:'' })

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null|'add'|'edit'|'delete'>(null)
  const [selected, setSelected] = useState<User|null>(null)
  const [form, setForm] = useState(blank())
  const [q, setQ] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all'|'active'|'inactive'>('all')
  const [saving, setSaving] = useState(false)
  const [pinVisible, setPinVisible] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) { const data = await res.json(); setUsers(Array.isArray(data) ? data : []) }
      else if (res.status === 403) router.push('/dashboard')
    } catch { console.error('Failed to fetch users') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const filtered = users.filter(u => {
    const matchQ = u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.isActive : !u.isActive)
    return matchQ && matchRole && matchStatus
  })

  const saveAdd = async () => {
    if (!form.name.trim() || !form.pin.trim()) { showToast('❌ Name and PIN required'); return }
    if (form.pin.length < 4) { showToast('❌ PIN must be at least 4 digits'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) { setUsers(u => [...u, data]); setModal(null); showToast(`✅ ${form.name} added`) }
      else showToast('❌ ' + data.error)
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const saveEdit = async () => {
    if (!selected || !form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, ...form }),
      })
      const data = await res.json()
      if (res.ok) { setUsers(u => u.map(x => x.id === selected.id ? data : x)); setModal(null); showToast('✅ User updated') }
      else showToast('❌ ' + data.error)
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const toggleActive = async (user: User) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name: user.name, email: user.email, pin: user.pin, role: user.role, isActive: !user.isActive }),
      })
      if (res.ok) {
        setUsers(u => u.map(x => x.id === user.id ? { ...x, isActive: !x.isActive } : x))
        showToast(user.isActive ? `${user.name} deactivated` : `${user.name} reactivated`)
      }
    } catch { showToast('❌ Error') }
  }

  const deleteUser = async () => {
    if (!selected) return
    if (selected.email === session?.user?.email) { showToast('❌ Cannot delete your own account'); setModal(null); return }
    try {
      const res = await fetch(`/api/users?id=${selected.id}`, { method: 'DELETE' })
      if (res.ok) { setUsers(u => u.filter(x => x.id !== selected.id)); setSelected(null); setModal(null); showToast(`🗑️ ${selected.name} deleted`) }
      else showToast('❌ ' + (await res.json()).error)
    } catch { showToast('❌ Error') }
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading users...</div>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>🔑 User Management</h1>
        <button onClick={() => { setForm(blank()); setModal('add') }} style={{ padding:'8px 18px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'700', fontSize:'13px' }}>+ Add User</button>
      </div>

      <div style={{ display:'flex', gap:'12px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
        {[{label:'Total',value:users.length,color:'#3b82f6'},{label:'Active',value:users.filter(u=>u.isActive).length,color:'#22c55e'},{label:'Inactive',value:users.filter(u=>!u.isActive).length,color:'#71717a'},{label:'Admins',value:users.filter(u=>u.role==='ADMIN'||u.role==='MANAGER').length,color:'#a855f7'}].map(k => (
          <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'10px 16px', minWidth:'100px' }}>
            <p style={{ fontSize:'20px', fontWeight:'800', color:k.color }}>{k.value}</p>
            <p style={{ fontSize:'11px', color:C.m }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:'10px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0, flexWrap:'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email..."
          style={{ padding:'7px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none', width:'200px' }} />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }}>
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
        </select>
        <div style={{ display:'flex', gap:'6px' }}>
          {(['all','active','inactive'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding:'6px 12px', borderRadius:'7px', border:`1px solid ${filterStatus===s ? C.br : C.b}`, background:filterStatus===s ? '#1a0f00' : 'transparent', color:filterStatus===s ? C.br : C.m, cursor:'pointer', fontSize:'12px', fontWeight:'600', textTransform:'capitalize' }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'0 20px' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.b}` }}>
              {['User','Role','PIN','Status','Actions'].map(h => (
                <th key={h} style={{ padding:'10px 8px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:C.m, textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom:`1px solid ${C.b}`, opacity:u.isActive ? 1 : 0.45 }}>
                <td style={{ padding:'12px 8px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:roleColors[u.role] ?? C.br, flexShrink:0 }}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ color:C.t, fontWeight:'600', fontSize:'14px' }}>{u.name}</p>
                      <p style={{ color:C.m, fontSize:'11px' }}>{u.email || 'No email'}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'12px 8px' }}>
                  <span style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'999px', background:(roleColors[u.role]+'22'), color:roleColors[u.role] ?? C.br, fontWeight:'700' }}>
                    {u.role.replace(/_/g,' ')}
                  </span>
                </td>
                <td style={{ padding:'12px 8px' }}>
                  <code style={{ fontSize:'15px', fontWeight:'800', color:C.t, letterSpacing:'0.15em', background:'#27272a', padding:'3px 8px', borderRadius:'6px' }}>{u.pin}</code>
                </td>
                <td style={{ padding:'12px 8px' }}>
                  <span style={{ fontSize:'11px', fontWeight:'700', padding:'3px 10px', borderRadius:'999px', background:u.isActive ? '#14532d' : '#27272a', color:u.isActive ? '#22c55e' : '#71717a' }}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding:'12px 8px' }}>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button onClick={() => { setForm({ name:u.name, email:u.email, pin:u.pin, role:u.role, password:'' }); setSelected(u); setModal('edit') }}
                      style={{ padding:'4px 10px', borderRadius:'6px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer', fontSize:'12px' }}>Edit</button>
                    <button onClick={() => toggleActive(u)}
                      style={{ padding:'4px 10px', borderRadius:'6px', border:`1px solid ${u.isActive ? '#78350f' : '#14532d'}`, background:'transparent', color:u.isActive ? '#f59e0b' : '#22c55e', cursor:'pointer', fontSize:'12px' }}>
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button onClick={() => { setSelected(u); setModal('delete') }}
                      style={{ padding:'4px 10px', borderRadius:'6px', border:'1px solid #7f1d1d', background:'transparent', color:'#ef4444', cursor:'pointer', fontSize:'12px' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign:'center', padding:'48px', color:'#52525b' }}><p style={{ fontSize:'36px', marginBottom:'10px' }}>🔍</p><p>No users found</p></div>}
      </div>

      {/* Add/Edit modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'20px', fontSize:'17px' }}>{modal === 'add' ? '+ Add New User' : `Edit — ${selected?.name}`}</h2>
            {[{label:'Full Name *',k:'name',type:'text',ph:'e.g. James Okello'},{label:'Email (optional)',k:'email',type:'email',ph:'user@restopos.com'}].map(f => (
              <div key={f.k} style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>{f.label}</label>
                <input type={f.type} placeholder={f.ph} value={(form as any)[f.k]}
                  onChange={e => setForm(x=>({...x,[f.k]:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            ))}
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Login PIN * (4–6 digits)</label>
              <div style={{ position:'relative' }}>
                <input type={pinVisible ? 'text' : 'password'} placeholder="e.g. 7777" value={form.pin}
                  onChange={e => setForm(x=>({...x,pin:e.target.value.replace(/\D/g,'').slice(0,6)}))}
                  style={{ width:'100%', padding:'9px 40px 9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'18px', letterSpacing:'0.2em', outline:'none', fontWeight:'700' }} />
                <button onClick={() => setPinVisible(v=>!v)} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'16px' }}>
                  {pinVisible ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'8px' }}>Role *</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px', marginBottom:'10px' }}>
                {roles.map(r => (
                  <button key={r} onClick={() => setForm(x=>({...x,role:r}))}
                    style={{ padding:'8px 10px', borderRadius:'8px', border:`1px solid ${form.role===r ? (roleColors[r]+'99') : C.b}`, background:form.role===r ? (roleColors[r]+'18') : 'transparent', color:form.role===r ? roleColors[r] : C.m, cursor:'pointer', fontSize:'12px', fontWeight:'600', textAlign:'left' }}>
                    {r.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
              {form.role && <div style={{ padding:'10px 12px', borderRadius:'8px', background:'#27272a', fontSize:'12px', color:C.m }}>{roleDesc[form.role]}</div>}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={modal === 'add' ? saveAdd : saveEdit} disabled={saving}
                style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : modal === 'add' ? 'Create User' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {modal === 'delete' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', border:'1px solid #7f1d1d', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'380px', textAlign:'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>🗑️</div>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'8px' }}>Delete User?</h2>
            <p style={{ color:'#ef4444', fontWeight:'700', fontSize:'16px', marginBottom:'6px' }}>{selected.name}</p>
            <p style={{ color:C.m, fontSize:'13px', marginBottom:'16px' }}>Role: {selected.role.replace(/_/g,' ')} · PIN: {selected.pin}</p>
            <div style={{ background:'#450a0a', border:'1px solid #7f1d1d', borderRadius:'8px', padding:'10px 14px', marginBottom:'20px', fontSize:'12px', color:'#fca5a5' }}>
              ⚠️ This cannot be undone. Consider <strong>Deactivating</strong> instead.
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'11px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={() => { toggleActive(selected); setModal(null) }} style={{ flex:1, padding:'11px', borderRadius:'8px', border:'1px solid #78350f', background:'transparent', color:'#f59e0b', cursor:'pointer', fontWeight:'700', fontSize:'13px' }}>Deactivate</button>
              <button onClick={deleteUser} style={{ flex:1, padding:'11px', borderRadius:'8px', border:'none', background:'#dc2626', color:'white', cursor:'pointer', fontWeight:'700' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
