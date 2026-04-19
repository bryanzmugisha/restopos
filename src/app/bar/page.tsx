'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface KotItem { id: string; name: string; quantity: number; notes?: string }
interface Kot {
  id: string; kotNumber: string; status: string; station: string
  createdAt: string; acknowledgedAt?: string
  order: {
    orderNumber: string; orderType: string
    table?: { name: string }
    waiter?: { name: string }
    items: { menuItem: { name: string; category: { name: string; station: string } }; quantity: number; notes?: string; status: string }[]
  }
}

const statusConfig = {
  PENDING:     { bg:'#450a0a', border:'#ef4444', dot:'#ef4444', label:'NEW',         next:'IN_PROGRESS', action:'Start Preparing' },
  IN_PROGRESS: { bg:'#1c1200', border:'#f59e0b', dot:'#f59e0b', label:'PREPARING',   next:'READY',       action:'Mark Ready' },
  READY:       { bg:'#052e16', border:'#22c55e', dot:'#22c55e', label:'READY',       next:'COMPLETED',   action:'Mark Served' },
  COMPLETED:   { bg:'#18181b', border:'#27272a', dot:'#71717a', label:'SERVED',      next:null,          action:'' },
}

export default function BarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kots, setKots] = useState<Kot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active'|'all'>('active')
  const [updating, setUpdating] = useState<string|null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchKots = useCallback(async () => {
    try {
      const res = await fetch('/api/bar')
      if (res.ok) { const data = await res.json(); setKots(Array.isArray(data) ? data : []) }
    } catch { console.error('Failed to fetch bar orders') }
    setLoading(false)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    fetchKots()
    const interval = setInterval(fetchKots, 12000) // auto-refresh every 12s
    return () => clearInterval(interval)
  }, [fetchKots])

  const advance = async (kotId: string, nextStatus: string) => {
    setUpdating(kotId)
    try {
      const res = await fetch('/api/bar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kotId, status: nextStatus }),
      })
      if (res.ok) fetchKots()
    } catch { console.error('Failed to update') }
    setUpdating(null)
  }

  const elapsed = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins/60)}h ${mins%60}m ago`
  }

  const urgent = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    return mins >= 10
  }

  const filtered = kots.filter(k =>
    filter === 'all' ? true : ['PENDING','IN_PROGRESS','READY'].includes(k.status)
  )

  const pending = kots.filter(k => k.status === 'PENDING').length
  const inProgress = kots.filter(k => k.status === 'IN_PROGRESS').length
  const ready = kots.filter(k => k.status === 'READY').length

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, color:C.m, flexDirection:'column', gap:'12px' }}>
      <div style={{ fontSize:'40px' }}>🍺</div>
      <p>Loading bar display...</p>
    </div>
  )

  return (
    <div className="page-root">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <div style={{ fontSize:'24px' }}>🍺</div>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, margin:0 }}>Bar & Counter Display</h1>
          <p style={{ fontSize:'11px', color:C.m, margin:0 }}>Drinks & Beverages Station · Refreshes every 12s · Last: {lastRefresh.toLocaleTimeString()}</p>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:'8px' }}>
          {[{label:'New',count:pending,color:'#ef4444'},{label:'Preparing',count:inProgress,color:'#f59e0b'},{label:'Ready',count:ready,color:'#22c55e'}].map(s => (
            <div key={s.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'8px', padding:'5px 10px', textAlign:'center', minWidth:'60px' }}>
              <p style={{ fontSize:'18px', fontWeight:'800', color:s.color, margin:0 }}>{s.count}</p>
              <p style={{ fontSize:'10px', color:C.m, margin:0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <button onClick={fetchKots} style={{ padding:'7px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.m, cursor:'pointer', fontSize:'12px' }}>🔄 Refresh</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        {(['active','all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'9px 24px', background:'none', border:'none', borderBottom:`2px solid ${filter===f?'#6366f1':'transparent'}`, color:filter===f?'#6366f1':C.m, cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>
            {f === 'active' ? `Active (${pending+inProgress+ready})` : `All Orders (${kots.length})`}
          </button>
        ))}
      </div>

      {/* KOT Grid */}
      <div className="scroll-area" style={{ padding: "12px" }}>
        {filtered.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', gap:'12px', color:'#52525b' }}>
            <div style={{ fontSize:'56px' }}>🍺</div>
            <p style={{ fontSize:'18px', color:C.m }}>No bar orders</p>
            <p style={{ fontSize:'14px' }}>Drinks orders will appear here</p>
          </div>
        ) : (
          <div className="kds-grid">
            {filtered.map(kot => {
              const sc = statusConfig[kot.status as keyof typeof statusConfig] ?? statusConfig.PENDING
              const isUrgent = urgent(kot.createdAt) && kot.status !== 'COMPLETED'
              const barItems = kot.order.items.filter(i => ['BAR','COUNTER','ALL'].includes(i.menuItem.category?.station ?? 'KITCHEN'))

              return (
                <div key={kot.id} style={{ borderRadius:'14px', border:`2px solid ${isUrgent && kot.status==='PENDING' ? '#ef4444' : sc.border}`, background:sc.bg, overflow:'hidden', animation: isUrgent && kot.status==='PENDING' ? 'pulse 2s infinite' : 'none' }}>

                  {/* KOT Header */}
                  <div style={{ padding:'12px 14px 10px', borderBottom:`1px solid ${C.b}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ color:C.t, fontWeight:'800', fontSize:'15px' }}>{kot.order.orderNumber}</span>
                          <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'999px', background:sc.dot+'22', color:sc.dot }}>{sc.label}</span>
                        </div>
                        <p style={{ color:C.m, fontSize:'12px', margin:'3px 0 0' }}>
                          {kot.order.table ? `🪑 Table ${kot.order.table.name}` : `🛍️ ${kot.order.orderType.replace('_',' ')}`}
                          {kot.order.waiter ? ` · ${kot.order.waiter.name}` : ''}
                        </p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ color:isUrgent && kot.status!=='COMPLETED' ? '#ef4444' : C.m, fontSize:'11px', fontWeight:isUrgent?'700':'400', margin:0 }}>
                          {isUrgent && kot.status!=='COMPLETED' ? '⚠️ ' : ''}{elapsed(kot.createdAt)}
                        </p>
                        <p style={{ color:'#6366f1', fontSize:'10px', margin:'2px 0 0', fontWeight:'600' }}>{kot.kotNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ padding:'12px 14px' }}>
                    {(barItems.length > 0 ? barItems : kot.order.items).map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'8px' }}>
                        <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(99,102,241,0.2)', border:'1px solid #6366f1', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'14px', color:'#818cf8', flexShrink:0 }}>
                          {item.quantity}
                        </div>
                        <div>
                          <p style={{ color:C.t, fontWeight:'600', fontSize:'14px', margin:0 }}>{item.menuItem.name}</p>
                          {item.notes && <p style={{ color:'#f59e0b', fontSize:'11px', margin:'2px 0 0' }}>📝 {item.notes}</p>}
                          <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'4px', background:'rgba(99,102,241,0.15)', color:'#818cf8' }}>
                            {item.menuItem.category?.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action button */}
                  {sc.next && (
                    <div style={{ padding:'0 14px 14px' }}>
                      <button
                        onClick={() => advance(kot.id, sc.next!)}
                        disabled={updating === kot.id}
                        style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', background:sc.dot, color:'white', cursor:'pointer', fontWeight:'700', fontSize:'13px', opacity:updating===kot.id?0.7:1 }}>
                        {updating === kot.id ? 'Updating...' : sc.action}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.2); }
        }
      `}</style>
    </div>
  )
}
