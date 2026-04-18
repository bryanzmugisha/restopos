'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type ResStatus = 'BOOKED'|'CONFIRMED'|'SEATED'|'COMPLETED'|'CANCELLED'|'NO_SHOW'
interface Reservation { id: string; guestName: string; guestPhone: string; partySize: number; reservationDate: string; status: ResStatus; notes?: string; table?: { name: string } }

const statusStyle: Record<ResStatus,{color:string;bg:string}> = {
  BOOKED:    { color:'#3b82f6', bg:'#1e3a5f' },
  CONFIRMED: { color:'#22c55e', bg:'#14532d' },
  SEATED:    { color:'#f97316', bg:'#431407' },
  COMPLETED: { color:'#71717a', bg:'#27272a' },
  CANCELLED: { color:'#ef4444', bg:'#450a0a' },
  NO_SHOW:   { color:'#f59e0b', bg:'#451a03' },
}

const nextStatus: Partial<Record<ResStatus,ResStatus>> = { BOOKED:'CONFIRMED', CONFIRMED:'SEATED', SEATED:'COMPLETED' }
const tables = ['T1','T2','T3','T4','T5','T6','VIP1','VIP2']

export default function ReservationsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today'|'upcoming'|'all'>('today')
  const [selected, setSelected] = useState<Reservation|null>(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ guestName:'', guestPhone:'', partySize:2, reservationDate:'', tableNo:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const today = new Date().toISOString().slice(0,10)

  const fetchReservations = useCallback(async () => {
    try {
      const url = filter === 'today' ? `/api/reservations?date=${today}` : '/api/reservations'
      const res = await fetch(url)
      if (res.ok) { const data = await res.json(); setReservations(Array.isArray(data) ? data : []) }
    } catch { console.error('Failed to fetch reservations') }
    setLoading(false)
  }, [filter, today])

  useEffect(() => { fetchReservations() }, [fetchReservations])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const updateStatus = async (id: string, newStatus: ResStatus) => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setReservations(r => r.map(x => x.id === id ? { ...x, status: newStatus } : x))
        if (selected?.id === id) setSelected(x => x ? { ...x, status: newStatus } : null)
        showToast('✅ Status updated')
      }
    } catch { showToast('❌ Error') }
  }

  const save = async () => {
    if (!form.guestName || !form.reservationDate) return
    setSaving(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const reservation = await res.json()
        setReservations(r => [reservation, ...r])
        setForm({ guestName:'', guestPhone:'', partySize:2, reservationDate:'', tableNo:'', notes:'' })
        setModal(false)
        showToast('✅ Reservation booked')
      } else {
        const err = await res.json()
        showToast('❌ ' + err.error)
      }
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const fmtTime = (dt: string) => new Date(dt).toLocaleTimeString('en-UG', { hour:'2-digit', minute:'2-digit' })
  const fmtDate = (dt: string) => new Date(dt).toLocaleDateString('en-UG', { weekday:'short', day:'numeric', month:'short' })
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading reservations...</div>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>📅 Reservations</h1>
        <button onClick={() => setModal(true)} style={{ padding:'8px 16px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>+ New Booking</button>
      </div>

      <div style={{ display:'flex', gap:'12px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
        {[{label:'Booked',v:reservations.filter(r=>r.status==='BOOKED').length,c:'#3b82f6'},{label:'Confirmed',v:reservations.filter(r=>r.status==='CONFIRMED').length,c:'#22c55e'},{label:'Seated',v:reservations.filter(r=>r.status==='SEATED').length,c:'#f97316'}].map(k => (
          <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'10px 16px', minWidth:'100px' }}>
            <p style={{ fontSize:'22px', fontWeight:'800', color:k.c }}>{k.v}</p>
            <p style={{ fontSize:'11px', color:C.m }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <div style={{ width:selected ? '360px' : '100%', display:'flex', flexDirection:'column', borderRight:selected ? `1px solid ${C.b}` : 'none', overflow:'hidden' }}>
          <div style={{ display:'flex', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
            {([['today','Today'],['upcoming','Upcoming'],['all','All']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{ flex:1, padding:'10px', background:'none', border:'none', borderBottom:`2px solid ${filter===v ? C.br : 'transparent'}`, color:filter===v ? C.br : C.m, cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>{l}</button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
            {reservations.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#52525b' }}>
                <p style={{ fontSize:'36px', marginBottom:'10px' }}>📅</p>
                <p>No reservations</p>
              </div>
            ) : reservations.map(r => {
              const ss = statusStyle[r.status]
              return (
                <div key={r.id} onClick={() => setSelected(r)} style={{ padding:'14px', borderRadius:'12px', border:`1px solid ${selected?.id===r.id ? C.br : C.b}`, background:selected?.id===r.id ? '#1a0f00' : C.s, cursor:'pointer', marginBottom:'8px', transition:'all 0.12s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                    <div>
                      <p style={{ color:C.t, fontWeight:'700', fontSize:'15px' }}>{r.guestName}</p>
                      <p style={{ color:C.m, fontSize:'12px' }}>{r.guestPhone}</p>
                    </div>
                    <span style={{ fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'999px', background:ss.bg, color:ss.color }}>{r.status}</span>
                  </div>
                  <div style={{ display:'flex', gap:'12px' }}>
                    <span style={{ fontSize:'13px', color:C.m }}>🕐 {fmtDate(r.reservationDate)} {fmtTime(r.reservationDate)}</span>
                    <span style={{ fontSize:'13px', color:C.m }}>👥 {r.partySize}</span>
                    {r.table && <span style={{ fontSize:'13px', color:C.m }}>🪑 {r.table.name}</span>}
                  </div>
                  {r.notes && <p style={{ fontSize:'12px', color:'#f59e0b', marginTop:'6px' }}>📝 {r.notes}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {selected && (
          <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ color:C.t, fontWeight:'700', fontSize:'20px' }}>{selected.guestName}</h2>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'22px' }}>×</button>
            </div>
            <div style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'12px', padding:'16px', marginBottom:'14px' }}>
              {[{label:'Date & Time',value:`${fmtDate(selected.reservationDate)} at ${fmtTime(selected.reservationDate)}`},{label:'Party Size',value:`${selected.partySize} guests`},{label:'Table',value:selected.table?.name ?? 'Not assigned'},{label:'Phone',value:selected.guestPhone},{label:'Status',value:selected.status}].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                  <span style={{ color:C.m, fontSize:'13px' }}>{r.label}</span>
                  <span style={{ color:C.t, fontSize:'13px', fontWeight:'500' }}>{r.value}</span>
                </div>
              ))}
            </div>
            {selected.notes && <div style={{ background:'#1a0f00', border:'1px solid #3f1f00', borderRadius:'10px', padding:'12px 14px', marginBottom:'16px' }}><p style={{ color:'#f59e0b', fontSize:'12px', marginBottom:'4px' }}>📝 Notes</p><p style={{ color:C.t, fontSize:'13px' }}>{selected.notes}</p></div>}
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {nextStatus[selected.status] && <button onClick={() => updateStatus(selected.id, nextStatus[selected.status]!)} style={{ padding:'12px', borderRadius:'10px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', fontSize:'14px' }}>→ Mark as {nextStatus[selected.status]}</button>}
              {selected.status === 'BOOKED' && <button onClick={() => updateStatus(selected.id, 'NO_SHOW')} style={{ padding:'12px', borderRadius:'10px', border:'1px solid #78350f', background:'transparent', color:'#f59e0b', cursor:'pointer', fontWeight:'600' }}>No Show</button>}
              {!['COMPLETED','CANCELLED'].includes(selected.status) && <button onClick={() => updateStatus(selected.id, 'CANCELLED')} style={{ padding:'12px', borderRadius:'10px', border:'1px solid #7f1d1d', background:'transparent', color:'#ef4444', cursor:'pointer', fontWeight:'600' }}>Cancel</button>}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(false)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'20px' }}>📅 New Reservation</h2>
            {[{label:'Guest Name *',k:'guestName',ph:'Full name'},{label:'Phone',k:'guestPhone',ph:'+256 7XX XXXXXX'}].map(f => (
              <div key={f.k} style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>{f.label}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm(x=>({...x,[f.k]:e.target.value}))} placeholder={f.ph} style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
              <div>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Date & Time *</label>
                <input type="datetime-local" value={form.reservationDate} onChange={e => setForm(x=>({...x,reservationDate:e.target.value}))} style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Party Size</label>
                <input type="number" min={1} max={20} value={form.partySize} onChange={e => setForm(x=>({...x,partySize:Number(e.target.value)}))} style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Table</label>
              <select value={form.tableNo} onChange={e => setForm(x=>({...x,tableNo:e.target.value}))} style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }}>
                <option value="">No preference</option>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Notes</label>
              <input value={form.notes} onChange={e => setForm(x=>({...x,notes:e.target.value}))} placeholder="Special requests..." style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>{saving ? 'Booking...' : 'Book'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
