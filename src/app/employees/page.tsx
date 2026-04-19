'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Employee {
  id: string; outletId: string; position: string; salaryType: string; salaryAmount: number
  joiningDate: string; isActive: boolean
  user: { id: string; name: string; email: string; role: string; pin: string }
  clockedIn?: boolean; clockInTime?: string
}

const roleColors: Record<string,string> = {
  ADMIN:'#a855f7', MANAGER:'#3b82f6', CASHIER:'#22c55e',
  WAITER:'#f97316', KITCHEN_STAFF:'#ef4444', DELIVERY_STAFF:'#f59e0b',
}

const blank = () => ({ name:'', email:'', pin:'', role:'WAITER', position:'', salaryType:'MONTHLY', salaryAmount:0, joiningDate:new Date().toISOString().slice(0,10), password:'' })

export default function EmployeesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Employee|null>(null)
  const [tab, setTab] = useState<'staff'|'attendance'>('staff')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(blank())
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  // Local clock-in state (not persisted to DB in this version)
  const [clockState, setClockState] = useState<Record<string, { in: boolean; time?: string }>>({})

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) { const data = await res.json(); setEmployees(Array.isArray(data) ? data : []) }
    } catch { console.error('Failed to fetch employees') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const fmt = (n: number) => 'UGX ' + n.toLocaleString()

  const filtered = employees.filter(e =>
    e.user.name.toLowerCase().includes(q.toLowerCase()) ||
    e.user.role.includes(q.toUpperCase()) ||
    (e.position ?? '').toLowerCase().includes(q.toLowerCase())
  )

  const clockToggle = (id: string) => {
    const now = new Date().toLocaleTimeString('en-UG', { hour:'2-digit', minute:'2-digit' })
    setClockState(s => ({ ...s, [id]: { in: !s[id]?.in, time: !s[id]?.in ? now : undefined } }))
    const emp = employees.find(e => e.id === id)
    showToast(clockState[id]?.in ? `${emp?.user.name} clocked out` : `${emp?.user.name} clocked in`)
  }

  const save = async () => {
    if (!form.name || !form.pin) { showToast('❌ Name and PIN required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const emp = await res.json()
        setEmployees(e => [...e, emp])
        setForm(blank()); setModal(false)
        showToast('✅ Employee added')
      } else {
        const err = await res.json()
        showToast('❌ ' + err.error)
      }
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const clockedInCount = Object.values(clockState).filter(s => s.in).length
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading employees...</div>

  return (
    <div className="page-root">
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>👤 Employees</h1>
        <button onClick={() => setModal(true)} style={{ padding:'8px 16px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>+ Add Staff</button>
      </div>

      <div style={{ display:'flex', gap:'12px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
        {[
          { label:'Total Staff', value:employees.length, color:'#3b82f6' },
          { label:'Clocked In', value:clockedInCount, color:'#22c55e' },
          { label:'Absent', value:employees.length-clockedInCount, color:'#ef4444' },
          { label:'Payroll/mo', value:'UGX '+employees.filter(e=>e.salaryType==='MONTHLY').reduce((s,e)=>s+e.salaryAmount,0).toLocaleString(), color:'#f97316' },
        ].map(k => (
          <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'10px 16px', minWidth:'130px' }}>
            <p style={{ fontSize:'18px', fontWeight:'800', color:k.color }}>{k.value}</p>
            <p style={{ fontSize:'11px', color:C.m }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        {([['staff','Staff List'],['attendance',"Today's Attendance"]] as const).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding:'11px 24px', background:'none', border:'none', borderBottom:`2px solid ${tab===v ? C.br : 'transparent'}`, color:tab===v ? C.br : C.m, cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>{l}</button>
        ))}
      </div>

      {tab === 'staff' && (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <div style={{ width:selected ? '340px' : '100%', display:'flex', flexDirection:'column', borderRight:selected ? `1px solid ${C.b}` : 'none', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff..."
                style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }} />
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#52525b' }}><p style={{ fontSize:'32px' }}>👤</p><p>No staff found</p></div>
              ) : filtered.map(emp => {
                const cs = clockState[emp.id]
                return (
                  <div key={emp.id} onClick={() => setSelected(emp)}
                    style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', borderRadius:'10px', cursor:'pointer', marginBottom:'4px', border:`1px solid ${selected?.id===emp.id ? C.br : 'transparent'}`, background:selected?.id===emp.id ? '#1a0f00' : 'transparent', transition:'all 0.12s' }}>
                    <div style={{ position:'relative' }}>
                      <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:roleColors[emp.user.role] ?? C.br }}>
                        {emp.user.name.charAt(0)}
                      </div>
                      <div style={{ position:'absolute', bottom:0, right:0, width:'10px', height:'10px', borderRadius:'50%', background:cs?.in ? '#22c55e' : '#3f3f46', border:`2px solid ${C.bg}` }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ color:C.t, fontWeight:'600', fontSize:'14px' }}>{emp.user.name}</p>
                      <p style={{ color:C.m, fontSize:'12px' }}>{emp.position ?? emp.user.role.replace(/_/g,' ')}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'999px', background:(roleColors[emp.user.role]+'22'), color:roleColors[emp.user.role], fontWeight:'700' }}>{emp.user.role.replace(/_/g,' ')}</span>
                      {cs?.in && <p style={{ fontSize:'11px', color:'#22c55e', marginTop:'3px' }}>In {cs.time}</p>}
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
                  <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'700', color:roleColors[selected.user.role] }}>
                    {selected.user.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ color:C.t, fontWeight:'700', fontSize:'20px' }}>{selected.user.name}</h2>
                    <p style={{ color:C.m, fontSize:'13px' }}>{selected.position}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'22px' }}>×</button>
              </div>

              <div style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'12px', padding:'16px', marginBottom:'14px' }}>
                {[
                  { label:'Role', value:selected.user.role.replace(/_/g,' ') },
                  { label:'Email', value:selected.user.email || '—' },
                  { label:'PIN', value:selected.user.pin },
                  { label:'Joined', value:selected.joiningDate ? new Date(selected.joiningDate).toLocaleDateString() : '—' },
                  { label:'Salary', value:selected.salaryType === 'MONTHLY' ? `${fmt(selected.salaryAmount)} / month` : `${fmt(selected.salaryAmount)} / hour` },
                ].map(r => (
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                    <span style={{ color:C.m, fontSize:'13px' }}>{r.label}</span>
                    <span style={{ color:C.t, fontSize:'13px', fontWeight:'500' }}>{r.value}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => clockToggle(selected.id)}
                style={{ width:'100%', padding:'13px', borderRadius:'10px', border:'none', background:clockState[selected.id]?.in ? '#450a0a' : '#14532d', color:clockState[selected.id]?.in ? '#ef4444' : '#22c55e', cursor:'pointer', fontWeight:'700', fontSize:'15px' }}>
                {clockState[selected.id]?.in ? '🔴 Clock Out' : '🟢 Clock In'}
              </button>
              {clockState[selected.id]?.in && <p style={{ textAlign:'center', color:'#22c55e', fontSize:'13px', marginTop:'8px' }}>Clocked in at {clockState[selected.id].time}</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="scroll-area" style={{ padding: "16px" }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {employees.map(emp => {
              const cs = clockState[emp.id]
              return (
                <div key={emp.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', background:C.s, border:`1px solid ${C.b}`, borderRadius:'12px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:cs?.in ? '#22c55e' : '#3f3f46', flexShrink:0 }} />
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:roleColors[emp.user.role], flexShrink:0 }}>
                    {emp.user.name.charAt(0)}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:C.t, fontWeight:'600', fontSize:'14px' }}>{emp.user.name}</p>
                    <p style={{ color:C.m, fontSize:'12px' }}>{emp.position ?? emp.user.role.replace(/_/g,' ')}</p>
                  </div>
                  <div style={{ textAlign:'right', marginRight:'12px' }}>
                    {cs?.in ? <p style={{ color:'#22c55e', fontWeight:'700', fontSize:'13px' }}>✓ In since {cs.time}</p> : <p style={{ color:'#52525b', fontSize:'13px' }}>Not clocked in</p>}
                  </div>
                  <button onClick={() => clockToggle(emp.id)} style={{ padding:'6px 12px', borderRadius:'7px', border:`1px solid ${cs?.in ? '#7f1d1d' : '#14532d'}`, background:'transparent', color:cs?.in ? '#ef4444' : '#22c55e', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
                    {cs?.in ? 'Out' : 'In'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(false)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'20px' }}>+ Add Staff Member</h2>
            {[{label:'Full Name *',k:'name',ph:'e.g. James Okello'},{label:'Position',k:'position',ph:'e.g. Waiter'},{label:'Email',k:'email',ph:'optional@email.com'},{label:'PIN (4-6 digits) *',k:'pin',ph:'e.g. 7777'}].map(f => (
              <div key={f.k} style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>{f.label}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm(x=>({...x,[f.k]:e.target.value}))} placeholder={f.ph}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
              <div>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>Role</label>
                <select value={form.role} onChange={e => setForm(x=>({...x,role:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }}>
                  {['WAITER','CASHIER','KITCHEN_STAFF','DELIVERY_STAFF','MANAGER'].map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>Salary Type</label>
                <select value={form.salaryType} onChange={e => setForm(x=>({...x,salaryType:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="HOURLY">Hourly</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>Salary Amount (UGX)</label>
              <input type="number" value={form.salaryAmount} onChange={e => setForm(x=>({...x,salaryAmount:Number(e.target.value)}))}
                style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Adding...' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
