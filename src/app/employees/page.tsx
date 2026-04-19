'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Employee {
  id: string; position: string; salaryType: string; salaryAmount: number
  joiningDate?: string; isActive: boolean
  user: { id: string; name: string; email?: string; role: string; pin: string }
  clockedIn?: boolean; clockInTime?: string
}

const roleColors: Record<string,string> = {
  ADMIN:'#a855f7', MANAGER:'#3b82f6', CASHIER:'#22c55e',
  WAITER:'#f97316', KITCHEN_STAFF:'#ef4444', BAR_STAFF:'#6366f1', DELIVERY_STAFF:'#f59e0b',
}

const blank = () => ({ name:'', email:'', pin:'', role:'WAITER', position:'', salaryType:'MONTHLY', salaryAmount:0, joiningDate:new Date().toISOString().slice(0,10), password:'' })

export default function EmployeesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Employee|null>(null)
  const [modal, setModal] = useState<'add'|'edit'|'delete'|null>(null)
  const [form, setForm] = useState(blank())
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [clockState, setClockState] = useState<Record<string,{in:boolean;time?:string}>>({})
  const isAdmin = ['ADMIN','MANAGER'].includes(session?.user.role ?? '')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const fmt = (n: number) => 'UGX ' + n.toLocaleString()

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) { const data = await res.json(); setEmployees(Array.isArray(data) ? data : []) }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const openEdit = (emp: Employee) => {
    setSelected(emp)
    setForm({ name: emp.user.name, email: emp.user.email ?? '', pin: emp.user.pin, role: emp.user.role, position: emp.position ?? '', salaryType: emp.salaryType, salaryAmount: emp.salaryAmount, joiningDate: emp.joiningDate?.slice(0,10) ?? '', password: '' })
    setModal('edit')
  }

  const openDelete = (emp: Employee) => { setSelected(emp); setModal('delete') }

  const save = async () => {
    if (!form.name || !form.pin) { showToast('❌ Name and PIN required'); return }
    setSaving(true)
    try {
      if (modal === 'add') {
        const res = await fetch('/api/employees', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        if (res.ok) { const emp = await res.json(); setEmployees(e => [...e, emp]); setModal(null); showToast('✅ Employee added') }
        else showToast('❌ ' + (await res.json()).error)
      } else if (modal === 'edit' && selected) {
        const res = await fetch('/api/employees', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selected.id, userId: selected.user.id, ...form }),
        })
        if (res.ok) {
          const updated = await res.json()
          setEmployees(e => e.map(x => x.id === selected.id ? updated : x))
          setModal(null); showToast('✅ Employee updated')
        } else showToast('❌ ' + (await res.json()).error)
      }
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const deleteEmployee = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/employees?id=${selected.id}`, { method: 'DELETE' })
      if (res.ok) {
        setEmployees(e => e.filter(x => x.id !== selected.id))
        setModal(null); setSelected(null); showToast('🗑️ Employee removed')
      } else showToast('❌ ' + (await res.json()).error)
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const clockToggle = (emp: Employee) => {
    const now = new Date().toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })
    const newIn = !clockState[emp.id]?.in
    setClockState(s => ({ ...s, [emp.id]: { in: newIn, time: newIn ? now : undefined } }))
    showToast(newIn ? `✅ ${emp.user.name} clocked in at ${now}` : `${emp.user.name} clocked out`)
  }

  const filtered = employees.filter(e =>
    e.user.name.toLowerCase().includes(q.toLowerCase()) ||
    e.user.role.includes(q.toUpperCase()) ||
    (e.position ?? '').toLowerCase().includes(q.toLowerCase())
  )

  const clockedIn = Object.values(clockState).filter(s => s.in).length
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  const FieldInput = ({ label, k, type='text', ph='', options=null }: any) => (
    <div style={{ marginBottom:'12px' }}>
      <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>{label}</label>
      {options ? (
        <select value={(form as any)[k]} onChange={e => setForm(x=>({...x,[k]:e.target.value}))}
          style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }}>
          {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={(form as any)[k]} onChange={e => setForm(x=>({...x,[k]:type==='number'?Number(e.target.value):e.target.value}))} placeholder={ph}
          style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
      )}
    </div>
  )

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:C.bg, color:C.m }}>Loading...</div>

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:C.bg, overflow:'hidden' }}>
      {toast && <div style={{ position:'fixed', top:'max(12px,env(safe-area-inset-top))', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'11px 20px', color:C.t, fontWeight:'600', fontSize:'14px', whiteSpace:'nowrap' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderBottom:`1px solid ${C.b}`, flexShrink:0, paddingTop:'max(10px,env(safe-area-inset-top))' }}>
        <button onClick={() => router.push('/dashboard')} style={{ width:'40px', height:'40px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
        <h1 style={{ fontSize:'16px', fontWeight:'700', color:C.t, flex:1, margin:0 }}>👤 Employees ({employees.length})</h1>
        {isAdmin && <button onClick={() => { setForm(blank()); setModal('add') }} style={{ padding:'8px 14px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'700', fontSize:'13px' }}>+ Add</button>}
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:'8px', padding:'8px 12px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
        {[
          { label:'Total', value:employees.length, color:'#3b82f6' },
          { label:'Clocked In', value:clockedIn, color:'#22c55e' },
          { label:'Absent', value:employees.length - clockedIn, color:'#ef4444' },
          { label:'Monthly Cost', value:'UGX '+employees.filter(e=>e.salaryType==='MONTHLY').reduce((s,e)=>s+e.salaryAmount,0).toLocaleString(), color:C.br },
        ].map(k => (
          <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'8px', padding:'8px 12px', minWidth:'100px', flexShrink:0 }}>
            <p style={{ fontSize:'16px', fontWeight:'800', color:k.color, margin:0 }}>{k.value}</p>
            <p style={{ fontSize:'10px', color:C.m, margin:0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding:'8px 12px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff..."
          style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none', boxSizing:'border-box' }} />
      </div>

      {/* Staff list */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' as any }}>
        {filtered.map(emp => {
          const cs = clockState[emp.id]
          return (
            <div key={emp.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderBottom:`1px solid ${C.b}`, opacity:emp.isActive?1:0.5 }}>
              {/* Avatar + status dot */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:roleColors[emp.user.role]??C.br }}>
                  {emp.user.name.charAt(0)}
                </div>
                <div style={{ position:'absolute', bottom:0, right:0, width:'12px', height:'12px', borderRadius:'50%', background:cs?.in?'#22c55e':'#3f3f46', border:`2px solid ${C.bg}` }} />
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:C.t, fontWeight:'600', fontSize:'14px', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.user.name}</p>
                <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'4px', background:(roleColors[emp.user.role]+'22'), color:roleColors[emp.user.role]??C.br, fontWeight:'700' }}>{emp.user.role.replace(/_/g,' ')}</span>
                  {emp.position && <span style={{ fontSize:'11px', color:C.m }}>{emp.position}</span>}
                  {cs?.in && <span style={{ fontSize:'10px', color:'#22c55e', fontWeight:'600' }}>In {cs.time}</span>}
                </div>
                <p style={{ color:C.m, fontSize:'11px', margin:'2px 0 0' }}>PIN: <strong style={{color:C.t}}>{emp.user.pin}</strong> · {emp.salaryType === 'MONTHLY' ? fmt(emp.salaryAmount)+'/mo' : fmt(emp.salaryAmount)+'/hr'}</p>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                <button onClick={() => clockToggle(emp)}
                  style={{ padding:'6px 10px', borderRadius:'7px', border:`1px solid ${cs?.in?'#7f1d1d':'#14532d'}`, background:'transparent', color:cs?.in?'#ef4444':'#22c55e', cursor:'pointer', fontSize:'11px', fontWeight:'600' }}>
                  {cs?.in ? 'Out' : 'In'}
                </button>
                {isAdmin && <>
                  <button onClick={() => openEdit(emp)}
                    style={{ padding:'6px 10px', borderRadius:'7px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer', fontSize:'11px' }}>✏️</button>
                  <button onClick={() => openDelete(emp)}
                    style={{ padding:'6px 10px', borderRadius:'7px', border:'1px solid #7f1d1d', background:'transparent', color:'#ef4444', cursor:'pointer', fontSize:'11px' }}>🗑️</button>
                </>}
              </div>
            </div>
          )
        })}
        <div style={{ height:'80px' }} />
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:50, display:'flex', alignItems:'flex-end' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', borderTop:`1px solid ${C.b}`, borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'90vh', overflowY:'auto', padding:'20px 16px', paddingBottom:'max(20px,env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'16px', fontSize:'16px' }}>{modal === 'add' ? '+ Add Employee' : `Edit — ${selected?.user.name}`}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
              <div style={{ gridColumn:'1/-1' }}><FieldInput label="Full Name *" k="name" ph="e.g. James Okello" /></div>
              <FieldInput label="PIN *" k="pin" ph="4-6 digits" />
              <FieldInput label="Email" k="email" type="email" ph="optional" />
              <FieldInput label="Position" k="position" ph="e.g. Head Waiter" />
              <FieldInput label="Role *" k="role" options={['WAITER','CASHIER','KITCHEN_STAFF','BAR_STAFF','DELIVERY_STAFF','MANAGER'].map(r=>({value:r,label:r.replace(/_/g,' ')}))} />
              <FieldInput label="Salary Type" k="salaryType" options={[{value:'MONTHLY',label:'Monthly'},{value:'HOURLY',label:'Hourly'}]} />
              <FieldInput label="Salary Amount (UGX)" k="salaryAmount" type="number" ph="0" />
              <FieldInput label="Joining Date" k="joiningDate" type="date" />
            </div>
            <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'11px', borderRadius:'10px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex:2, padding:'11px', borderRadius:'10px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', fontSize:'14px', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : modal === 'add' ? 'Add Employee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {modal === 'delete' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', border:'1px solid #7f1d1d', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'360px', textAlign:'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>🗑️</div>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'6px' }}>Remove Employee?</h2>
            <p style={{ color:'#ef4444', fontWeight:'700', fontSize:'16px', margin:'0 0 4px' }}>{selected.user.name}</p>
            <p style={{ color:C.m, fontSize:'13px', marginBottom:'16px' }}>{selected.user.role.replace(/_/g,' ')} · PIN: {selected.user.pin}</p>
            <div style={{ background:'#450a0a', border:'1px solid #7f1d1d', borderRadius:'8px', padding:'10px', marginBottom:'20px', fontSize:'12px', color:'#fca5a5' }}>
              ⚠️ This will deactivate the employee record and disable their login.
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'11px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={deleteEmployee} disabled={saving} style={{ flex:1, padding:'11px', borderRadius:'8px', border:'none', background:'#dc2626', color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
