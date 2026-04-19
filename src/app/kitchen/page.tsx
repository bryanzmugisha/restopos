'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface KotItem { name: string; quantity: number; notes?: string }
interface Kot { id: string; kotNumber: string; orderNumber: string; tableNo?: string; orderType: string; items: KotItem[]; status: string; createdAt: string; station?: string }

function getUrgency(date: string) {
  const mins = (Date.now() - new Date(date).getTime()) / 60000
  if (mins >= 20) return 'urgent'
  if (mins >= 10) return 'warning'
  return 'normal'
}
function minsAgo(date: string) { return Math.floor((Date.now() - new Date(date).getTime()) / 60000) }

const urgencyStyle = {
  normal:  { border:'#27272a', badge:'#22c55e', label:'On time' },
  warning: { border:'#f59e0b', badge:'#f59e0b', label:'Running late' },
  urgent:  { border:'#ef4444', badge:'#ef4444', label:'Urgent!' },
}

export default function KitchenPage() {
  const { status } = useSession()
  const router = useRouter()
  const [kots, setKots] = useState<Kot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL'|'PENDING'|'IN_PROGRESS'>('ALL')
  const [, setTick] = useState(0)
  const [lastCount, setLastCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    // Request notification permission for kitchen alerts
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [status])

  const fetchKots = useCallback(async () => {
    try {
      const res = await fetch('/api/kots')
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        // Play sound if new orders came in
        const pending = list.filter((k: Kot) => k.status === 'PENDING').length
        if (pending > lastCount && lastCount > 0) {
          try { new Audio('/notify.mp3').play().catch(() => {}) } catch {}
        }
        setLastCount(pending)
        setKots(list)
      }
    } catch { console.error('Failed to fetch KOTs') }
    setLoading(false)
  }, [lastCount])

  useEffect(() => { fetchKots() }, [fetchKots])
  useEffect(() => {
    const i = setInterval(() => { fetchKots(); setTick(t => t + 1) }, 12000)
    return () => clearInterval(i)
  }, [fetchKots])

  const advance = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED'
    try {
      const res = await fetch('/api/kots', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      })
      if (res.ok) {
        if (next === 'COMPLETED') setKots(k => k.filter(x => x.id !== id))
        else setKots(k => k.map(x => x.id === id ? { ...x, status: next } : x))
      }
    } catch {}
  }

  const filtered = kots.filter(k => filter === 'ALL' || k.status === filter)
  const pending = kots.filter(k => k.status === 'PENDING').length
  const inProgress = kots.filter(k => k.status === 'IN_PROGRESS').length
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:C.bg, color:C.m, flexDirection:'column', gap:'12px' }}>
      <div style={{ fontSize:'40px' }}>👨‍🍳</div><p>Loading kitchen...</p>
    </div>
  )

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:C.bg, overflow:'hidden' }}>

      {/* Header - always visible, fixed at top */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderBottom:`1px solid ${C.b}`, flexShrink:0, paddingTop:'max(10px, env(safe-area-inset-top))' }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ width:'36px', height:'36px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          ←
        </button>
        <span style={{ fontSize:'20px', flexShrink:0 }}>👨‍🍳</span>
        <h1 style={{ fontSize:'16px', fontWeight:'700', color:C.t, flex:1, margin:0 }}>Kitchen Display</h1>
        <div style={{ display:'flex', gap:'12px', alignItems:'center', flexShrink:0 }}>
          {pending > 0 && <div style={{ textAlign:'center' }}><p style={{ fontSize:'20px', fontWeight:'800', color:'#ef4444', margin:0, lineHeight:1 }}>{pending}</p><p style={{ fontSize:'10px', color:C.m, margin:0 }}>New</p></div>}
          {inProgress > 0 && <div style={{ textAlign:'center' }}><p style={{ fontSize:'20px', fontWeight:'800', color:'#f59e0b', margin:0, lineHeight:1 }}>{inProgress}</p><p style={{ fontSize:'10px', color:C.m, margin:0 }}>Cooking</p></div>}
          <button onClick={fetchKots} style={{ padding:'6px 10px', borderRadius:'7px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer', fontSize:'12px' }}>↻</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'6px', padding:'8px 12px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
        {(['ALL','PENDING','IN_PROGRESS'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'6px 14px', borderRadius:'8px', border:'1px solid', borderColor:filter===f?C.br:C.b, background:filter===f?'#1a0f00':'transparent', color:filter===f?C.br:C.m, cursor:'pointer', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap', flexShrink:0 }}>
            {f === 'ALL' ? `All (${kots.length})` : f === 'PENDING' ? `🔴 Pending (${pending})` : `🟡 Cooking (${inProgress})`}
          </button>
        ))}
      </div>

      {/* KOT grid - scrollable */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' as any, padding:'10px' }}>
        {filtered.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'70%', gap:'10px', color:'#52525b' }}>
            <p style={{ fontSize:'48px' }}>✅</p>
            <p style={{ fontSize:'16px', fontWeight:'600', color:C.m }}>All caught up!</p>
            <p style={{ fontSize:'13px' }}>Auto-refreshes every 12 seconds</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'10px' }}>
            {filtered.map(kot => {
              const u = getUrgency(kot.createdAt)
              const s = urgencyStyle[u]
              const mins = minsAgo(kot.createdAt)
              return (
                <div key={kot.id} style={{ background:C.s, border:`2px solid ${s.border}`, borderRadius:'14px', overflow:'hidden', animation:u==='urgent'?'pulse 2s infinite':'none', display:'flex', flexDirection:'column' }}>
                  <div style={{ padding:'10px 12px', background:'#0f0f10', borderBottom:`1px solid ${s.border}33`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <p style={{ fontSize:'14px', fontWeight:'800', color:C.t, margin:'0 0 2px' }}>{kot.kotNumber}</p>
                      <p style={{ fontSize:'11px', color:C.m, margin:0 }}>{kot.tableNo ? `Table ${kot.tableNo}` : kot.orderType.replace('_',' ')} · {kot.orderNumber}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'999px', background:s.badge+'22', color:s.badge }}>{mins}m · {s.label}</span>
                      <p style={{ fontSize:'10px', color:'#52525b', marginTop:'2px' }}>{kot.status === 'PENDING' ? '⏳ Waiting' : '🔥 Cooking'}</p>
                    </div>
                  </div>
                  <div style={{ padding:'10px 12px', flex:1 }}>
                    {kot.items.map((item, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'5px 0', borderBottom:i < kot.items.length-1 ? `1px solid ${C.b}` : 'none' }}>
                        <div>
                          <p style={{ fontSize:'14px', fontWeight:'600', color:C.t, margin:'0 0 1px' }}>{item.name}</p>
                          {item.notes && <p style={{ fontSize:'10px', color:'#f59e0b', margin:0 }}>📝 {item.notes}</p>}
                        </div>
                        <span style={{ fontSize:'18px', fontWeight:'800', color:C.br, flexShrink:0, marginLeft:'8px' }}>×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:'8px 12px', borderTop:`1px solid ${C.b}` }}>
                    <button onClick={() => advance(kot.id, kot.status)}
                      style={{ width:'100%', padding:'11px', borderRadius:'10px', border:'none', background:kot.status==='PENDING'?'#ef4444':'#22c55e', color:'white', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                      {kot.status === 'PENDING' ? '🔥 Start Cooking' : '✅ Mark Ready'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ height:'80px' }} />{/* Bottom padding for PWA banner */}
      </div>
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}`}</style>
    </div>
  )
}
