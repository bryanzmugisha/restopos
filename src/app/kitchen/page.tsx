'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface KotItem { name: string; quantity: number; notes?: string }
interface Kot { id: string; kotNumber: string; orderNumber: string; tableNo?: string; orderType: string; items: KotItem[]; status: string; createdAt: string }

const urgencyStyle = {
  normal:  { border:'#27272a', badge:'#22c55e', label:'On time' },
  warning: { border:'#f59e0b', badge:'#f59e0b', label:'Running late' },
  urgent:  { border:'#ef4444', badge:'#ef4444', label:'Urgent!' },
}

function getUrgency(date: string) {
  const mins = (Date.now() - new Date(date).getTime()) / 60000
  if (mins >= 20) return 'urgent'
  if (mins >= 10) return 'warning'
  return 'normal'
}

function minsAgo(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000)
}

export default function KitchenPage() {
  const { status } = useSession()
  const router = useRouter()
  const [kots, setKots] = useState<Kot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL'|'PENDING'|'IN_PROGRESS'>('ALL')
  const [tick, setTick] = useState(0)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchKots = useCallback(async () => {
    try {
      const res = await fetch('/api/kots')
      if (res.ok) { const data = await res.json(); setKots(Array.isArray(data) ? data : []) }
    } catch { console.error('Failed to fetch KOTs') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchKots() }, [fetchKots])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => { fetchKots(); setTick(t => t + 1) }, 15000)
    return () => clearInterval(interval)
  }, [fetchKots])

  const advance = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED'
    try {
      const res = await fetch('/api/kots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      })
      if (res.ok) {
        if (next === 'COMPLETED') {
          setKots(k => k.filter(x => x.id !== id))
        } else {
          setKots(k => k.map(x => x.id === id ? { ...x, status: next } : x))
        }
      }
    } catch { console.error('Failed to update KOT') }
  }

  const filtered = kots.filter(k => filter === 'ALL' || k.status === filter)
  const pending = kots.filter(k => k.status === 'PENDING').length
  const inProgress = kots.filter(k => k.status === 'IN_PROGRESS').length

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading kitchen...</div>

  return (
    <div className="page-root">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
          <span style={{ fontSize:'22px' }}>👨‍🍳</span>
          <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t }}>Kitchen Display</h1>
        </div>
        <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
          <div style={{ textAlign:'center' }}><p style={{ fontSize:'22px', fontWeight:'800', color:'#ef4444' }}>{pending}</p><p style={{ fontSize:'11px', color:C.m }}>Pending</p></div>
          <div style={{ textAlign:'center' }}><p style={{ fontSize:'22px', fontWeight:'800', color:'#f59e0b' }}>{inProgress}</p><p style={{ fontSize:'11px', color:C.m }}>Cooking</p></div>
          <button onClick={fetchKots} style={{ padding:'6px 12px', borderRadius:'7px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer', fontSize:'12px' }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:'8px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        {(['ALL','PENDING','IN_PROGRESS'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'6px 16px', borderRadius:'8px', border:'1px solid', borderColor:filter===f ? C.br : C.b, background:filter===f ? '#1a0f00' : 'transparent', color:filter===f ? C.br : C.m, cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
            {f === 'ALL' ? 'All Active' : f === 'PENDING' ? '🔴 Pending' : '🟡 Cooking'}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#52525b' }}>
            <p style={{ fontSize:'48px', marginBottom:'12px' }}>✅</p>
            <p style={{ fontSize:'18px', fontWeight:'600', color:C.m }}>All caught up!</p>
            <p style={{ fontSize:'14px', marginTop:'4px' }}>Auto-refreshes every 15 seconds</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'14px' }}>
            {filtered.map(kot => {
              const u = getUrgency(kot.createdAt)
              const s = urgencyStyle[u]
              const mins = minsAgo(kot.createdAt)
              return (
                <div key={kot.id} style={{ background:C.s, border:`2px solid ${s.border}`, borderRadius:'14px', overflow:'hidden', animation:u==='urgent' ? 'pulse 2s infinite' : 'none' }}>
                  <div style={{ padding:'12px 14px', background:'#0f0f10', borderBottom:`1px solid ${s.border}33`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <p style={{ fontSize:'15px', fontWeight:'800', color:C.t }}>{kot.kotNumber}</p>
                      <p style={{ fontSize:'12px', color:C.m }}>{kot.tableNo ? `Table ${kot.tableNo}` : kot.orderType.replace('_',' ')} · {kot.orderNumber}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'999px', background:s.badge+'22', color:s.badge }}>{mins}m · {s.label}</span>
                      <p style={{ fontSize:'11px', color:'#52525b', marginTop:'2px' }}>{kot.status === 'PENDING' ? '⏳ Waiting' : '🔥 Cooking'}</p>
                    </div>
                  </div>
                  <div style={{ padding:'12px 14px' }}>
                    {kot.items.map((item, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'6px 0', borderBottom:i < kot.items.length-1 ? `1px solid ${C.b}` : 'none' }}>
                        <div>
                          <p style={{ fontSize:'15px', fontWeight:'600', color:C.t }}>{item.name}</p>
                          {item.notes && <p style={{ fontSize:'11px', color:'#f59e0b', marginTop:'2px' }}>📝 {item.notes}</p>}
                        </div>
                        <span style={{ fontSize:'18px', fontWeight:'800', color:C.br }}>×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.b}` }}>
                    <button onClick={() => advance(kot.id, kot.status)} style={{ width:'100%', padding:'10px', borderRadius:'8px', border:'none', background:kot.status === 'PENDING' ? '#ef4444' : '#22c55e', color:'white', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                      {kot.status === 'PENDING' ? '🔥 Start Cooking' : '✅ Mark Ready'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }`}</style>
    </div>
  )
}
