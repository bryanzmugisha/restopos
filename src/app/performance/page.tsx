'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface StaffPerf {
  id: string; name: string; role: string
  totalOrders: number; completedOrders: number; openOrders: number
  totalRevenue: number; pendingRevenue: number; totalItems: number; avgOrderValue: number
}

export default function PerformancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<{ staff: StaffPerf[]; generatedAt: string } | null>(null)
  const [range, setRange] = useState('1')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/performance?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()
  const roleColors: Record<string,string> = { ADMIN:'#a855f7', MANAGER:'#3b82f6', CASHIER:'#22c55e', WAITER:'#f97316', KITCHEN_STAFF:'#ef4444', DELIVERY_STAFF:'#f59e0b' }
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  return (
    <div className="page-root">
      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>🏆 Staff Performance</h1>
        <div style={{ display:'flex', gap:'6px' }}>
          {[['1','Today'],['7','7 days'],['30','30 days']].map(([v,l]) => (
            <button key={v} onClick={() => setRange(v)} style={{ padding:'5px 12px', borderRadius:'7px', border:'1px solid', borderColor:range===v?C.br:C.b, background:range===v?'#1a0f00':'transparent', color:range===v?C.br:C.m, cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="scroll-area" style={{ padding: "16px" }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:C.m }}>Loading performance data...</div>
        ) : !data?.staff.length ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#52525b' }}>
            <p style={{ fontSize:'36px', marginBottom:'10px' }}>🏆</p>
            <p style={{ color:C.m }}>No order data for this period</p>
          </div>
        ) : (
          <>
            {/* Leaderboard */}
            <div style={{ display:'flex', flexDirection:'column', gap:'12px', maxWidth:'800px' }}>
              {data.staff.map((s, i) => (
                <div key={s.id} style={{ background:C.s, border:`1px solid ${i===0?C.br:C.b}`, borderRadius:'14px', padding:'16px', position:'relative' }}>
                  {i === 0 && <div style={{ position:'absolute', top:'12px', right:'14px', fontSize:'20px' }}>🥇</div>}
                  {i === 1 && <div style={{ position:'absolute', top:'12px', right:'14px', fontSize:'20px' }}>🥈</div>}
                  {i === 2 && <div style={{ position:'absolute', top:'12px', right:'14px', fontSize:'20px' }}>🥉</div>}

                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:roleColors[s.role]??C.br }}>
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ color:C.t, fontWeight:'700', fontSize:'15px', margin:'0 0 2px' }}>{s.name}</p>
                      <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'999px', background:(roleColors[s.role]??C.br)+'22', color:roleColors[s.role]??C.br, fontWeight:'700' }}>{s.role.replace(/_/g,' ')}</span>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
                    {[
                      { label:'Orders Done', value:s.completedOrders, color:'#22c55e' },
                      { label:'Revenue Served', value:fmt(s.totalRevenue), color:C.br },
                      { label:'Items Sold', value:s.totalItems, color:'#3b82f6' },
                      { label:'Open Orders', value:s.openOrders, color:'#f59e0b' },
                      { label:'Pending Bills', value:fmt(s.pendingRevenue), color:'#f59e0b' },
                      { label:'Avg Order', value:fmt(s.avgOrderValue), color:C.m },
                    ].map(k => (
                      <div key={k.label} style={{ background:C.bg, borderRadius:'8px', padding:'10px' }}>
                        <p style={{ fontSize:'15px', fontWeight:'800', color:k.color, margin:'0 0 2px' }}>{k.value}</p>
                        <p style={{ fontSize:'10px', color:C.m, margin:0 }}>{k.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {data.generatedAt && <p style={{ color:'#3f3f46', fontSize:'11px', marginTop:'16px', textAlign:'center' }}>Generated {new Date(data.generatedAt).toLocaleString()}</p>}
          </>
        )}
      </div>
    </div>
  )
}
