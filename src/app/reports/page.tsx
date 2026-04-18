'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function ReportsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [range, setRange] = useState('7')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  const maxRevenue = data?.daily ? Math.max(...data.daily.map((d: any) => d.revenue), 1) : 1

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>📊 Reports & Analytics</h1>
        <div style={{ display:'flex', gap:'6px' }}>
          {[['7','7 days'],['14','14 days'],['30','30 days']].map(([v,l]) => (
            <button key={v} onClick={() => setRange(v)} style={{ padding:'5px 12px', borderRadius:'7px', border:'1px solid', borderColor:range===v ? C.br : C.b, background:range===v ? '#1a0f00' : 'transparent', color:range===v ? C.br : C.m, cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:C.m }}>Loading reports...</div>
        ) : !data || data.totalOrders === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#52525b' }}>
            <p style={{ fontSize:'48px', marginBottom:'12px' }}>📊</p>
            <p style={{ fontSize:'18px', fontWeight:'600', color:C.m }}>No completed orders yet</p>
            <p style={{ fontSize:'14px', marginTop:'8px' }}>Place and complete some orders to see reports here</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'12px', marginBottom:'24px' }}>
              {[
                { label:'Revenue', value:fmt(data.totalRevenue), color:C.br, icon:'💰' },
                { label:'Orders', value:data.totalOrders, color:'#3b82f6', icon:'🧾' },
                { label:'Avg Order', value:fmt(data.avgOrderValue), color:'#22c55e', icon:'📈' },
              ].map(k => (
                <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'12px', padding:'16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                    <span style={{ fontSize:'13px', color:C.m }}>{k.label}</span>
                    <span style={{ fontSize:'18px' }}>{k.icon}</span>
                  </div>
                  <p style={{ fontSize:'18px', fontWeight:'800', color:k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'14px', padding:'20px', marginBottom:'20px' }}>
              <h3 style={{ color:C.t, fontWeight:'700', marginBottom:'20px', fontSize:'15px' }}>Daily Revenue</h3>
              <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'120px' }}>
                {data.daily?.map((d: any) => {
                  const h = Math.max(4, Math.round((d.revenue / maxRevenue) * 100))
                  const dayLabel = new Date(d.day).toLocaleDateString('en', { weekday:'short' })
                  return (
                    <div key={d.day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', height:'100%', justifyContent:'flex-end' }}>
                      {d.revenue > 0 && <span style={{ fontSize:'10px', color:C.m }}>{Math.round(d.revenue/1000)}k</span>}
                      <div style={{ width:'100%', height:`${h}%`, borderRadius:'4px 4px 0 0', background:d.revenue > 0 ? C.br : '#27272a', minHeight:'4px' }} />
                      <span style={{ fontSize:'10px', color:C.m }}>{dayLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top items */}
            {data.topItems?.length > 0 && (
              <div style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'14px', padding:'20px', marginBottom:'20px' }}>
                <h3 style={{ color:C.t, fontWeight:'700', marginBottom:'16px', fontSize:'15px' }}>Top Selling Items</h3>
                {data.topItems.map((item: any, i: number) => (
                  <div key={item.name} style={{ marginBottom:'14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ color:C.t, fontSize:'14px' }}><span style={{ color:'#52525b', marginRight:'8px' }}>#{i+1}</span>{item.name}</span>
                      <span style={{ color:C.m, fontSize:'13px' }}>{item.qty} sold</span>
                    </div>
                    <div style={{ background:'#27272a', borderRadius:'4px', height:'6px' }}>
                      <div style={{ background:C.br, height:'100%', borderRadius:'4px', width:`${(item.qty / data.topItems[0].qty) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment breakdown */}
            {data.paymentBreakdown?.length > 0 && (
              <div style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'14px', padding:'20px' }}>
                <h3 style={{ color:C.t, fontWeight:'700', marginBottom:'16px', fontSize:'15px' }}>Payment Methods</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'10px' }}>
                  {data.paymentBreakdown.map((p: any) => {
                    const total = data.paymentBreakdown.reduce((s: number, x: any) => s + x.amount, 0)
                    const pct = Math.round((p.amount / total) * 100)
                    return (
                      <div key={p.method} style={{ background:'#27272a', borderRadius:'10px', padding:'14px', textAlign:'center' }}>
                        <p style={{ fontSize:'24px', fontWeight:'800', color:C.br }}>{pct}%</p>
                        <p style={{ fontSize:'12px', color:C.m, marginTop:'4px' }}>{p.method.replace('_',' ')}</p>
                        <p style={{ fontSize:'11px', color:'#52525b', marginTop:'2px' }}>{fmt(p.amount)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
