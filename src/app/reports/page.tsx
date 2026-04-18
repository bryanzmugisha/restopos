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
  const [exporting, setExporting] = useState<'excel'|'pdf'|null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()
  const maxRevenue = data?.daily ? Math.max(...data.daily.map((d: any) => d.revenue), 1) : 1

  // Export to CSV/Excel
  const exportExcel = async () => {
    if (!data) return
    setExporting('excel')
    try {
      // Build CSV content
      const rows: string[][] = []

      rows.push([`RestoPOS Sales Report — Last ${range} Days`])
      rows.push([`Generated: ${new Date().toLocaleString()}`])
      rows.push([])

      // Summary
      rows.push(['SUMMARY'])
      rows.push(['Total Revenue', `UGX ${Math.round(data.totalRevenue).toLocaleString()}`])
      rows.push(['Total Orders', data.totalOrders.toString()])
      rows.push(['Average Order Value', `UGX ${Math.round(data.avgOrderValue).toLocaleString()}`])
      rows.push([])

      // Daily breakdown
      rows.push(['DAILY REVENUE'])
      rows.push(['Date', 'Revenue (UGX)', 'Orders'])
      for (const d of (data.daily ?? [])) {
        rows.push([d.day, Math.round(d.revenue).toString(), d.orders.toString()])
      }
      rows.push([])

      // Top items
      rows.push(['TOP SELLING ITEMS'])
      rows.push(['Item', 'Qty Sold', 'Revenue (UGX)'])
      for (const item of (data.topItems ?? [])) {
        rows.push([item.name, item.qty.toString(), Math.round(item.revenue).toString()])
      }
      rows.push([])

      // Payment breakdown
      rows.push(['PAYMENT METHODS'])
      rows.push(['Method', 'Amount (UGX)'])
      for (const p of (data.paymentBreakdown ?? [])) {
        rows.push([p.method.replace('_',' '), Math.round(p.amount).toString()])
      }

      // Convert to CSV
      const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `restopos-report-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Export failed') }
    setExporting(null)
  }

  // Export to PDF (print)
  const exportPDF = () => {
    setExporting('pdf')
    window.print()
    setTimeout(() => setExporting(null), 2000)
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  return (
    <div style={{ minHeight:'100vh', background:C.bg }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: #111 !important; }
          .print-card { background: white !important; border: 1px solid #ddd !important; color: #111 !important; }
          .print-text { color: #111 !important; }
          .print-muted { color: #555 !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}` }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>📊 Reports & Analytics</h1>

        {/* Range selector */}
        <div style={{ display:'flex', gap:'6px' }}>
          {[['7','7 days'],['14','14 days'],['30','30 days'],['90','90 days']].map(([v,l]) => (
            <button key={v} onClick={() => setRange(v)} style={{ padding:'5px 12px', borderRadius:'7px', border:'1px solid', borderColor:range===v?C.br:C.b, background:range===v?'#1a0f00':'transparent', color:range===v?C.br:C.m, cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>{l}</button>
          ))}
        </div>

        {/* Export buttons */}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={exportExcel} disabled={!data || exporting === 'excel'}
            style={{ padding:'8px 14px', borderRadius:'8px', background:'#14532d', border:'none', color:'#22c55e', cursor:'pointer', fontWeight:'600', fontSize:'13px', opacity:!data?0.5:1 }}>
            {exporting === 'excel' ? '...' : '📥 Excel'}
          </button>
          <button onClick={exportPDF} disabled={!data || exporting === 'pdf'}
            style={{ padding:'8px 14px', borderRadius:'8px', background:'#450a0a', border:'none', color:'#ef4444', cursor:'pointer', fontWeight:'600', fontSize:'13px', opacity:!data?0.5:1 }}>
            {exporting === 'pdf' ? '...' : '📄 PDF'}
          </button>
        </div>
      </div>

      {/* Print header */}
      <div style={{ display:'none' }} className="print-header">
        <div style={{ textAlign:'center', padding:'20px', borderBottom:'2px solid #111' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'700', margin:'0 0 4px' }}>RestoPOS Sales Report</h1>
          <p style={{ margin:'0', color:'#555', fontSize:'13px' }}>Period: Last {range} days · Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'960px', margin:'0 auto' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:C.m }}>Loading reports...</div>
        ) : !data || data.totalOrders === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#52525b' }}>
            <p style={{ fontSize:'48px', marginBottom:'12px' }}>📊</p>
            <p style={{ fontSize:'18px', fontWeight:'600', color:C.m }}>No completed orders yet</p>
            <p style={{ fontSize:'14px', marginTop:'8px' }}>Complete some orders to see reports here</p>
          </div>
        ) : <>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'12px', marginBottom:'24px' }}>
            {[
              { label:'Revenue', value:fmt(data.totalRevenue), color:C.br, icon:'💰' },
              { label:'Orders', value:data.totalOrders.toString(), color:'#3b82f6', icon:'🧾' },
              { label:'Avg Order', value:fmt(data.avgOrderValue), color:'#22c55e', icon:'📈' },
            ].map(k => (
              <div key={k.label} className="print-card" style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'12px', padding:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                  <span className="print-muted" style={{ fontSize:'13px', color:C.m }}>{k.label}</span>
                  <span style={{ fontSize:'18px' }}>{k.icon}</span>
                </div>
                <p className="print-text" style={{ fontSize:'18px', fontWeight:'800', color:k.color, margin:0 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="print-card" style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'14px', padding:'20px', marginBottom:'20px' }}>
            <h3 className="print-text" style={{ color:C.t, fontWeight:'700', marginBottom:'20px', fontSize:'15px' }}>Daily Revenue — Last {range} days</h3>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'120px' }}>
              {data.daily?.map((d: any) => {
                const h = Math.max(4, Math.round((d.revenue / maxRevenue) * 100))
                const dayLabel = new Date(d.day).toLocaleDateString('en', { weekday:'short', day:'numeric' })
                return (
                  <div key={d.day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', height:'100%', justifyContent:'flex-end' }}>
                    {d.revenue > 0 && <span style={{ fontSize:'9px', color:C.m }}>{Math.round(d.revenue/1000)}k</span>}
                    <div style={{ width:'100%', height:`${h}%`, borderRadius:'4px 4px 0 0', background:d.revenue > 0 ? C.br : '#27272a', minHeight:'4px' }} />
                    <span style={{ fontSize:'9px', color:C.m, whiteSpace:'nowrap' }}>{dayLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Daily table — shows in PDF */}
          <div className="print-card" style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'14px', padding:'20px', marginBottom:'20px' }}>
            <h3 className="print-text" style={{ color:C.t, fontWeight:'700', marginBottom:'14px', fontSize:'15px' }}>Daily Breakdown</h3>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.b}` }}>
                  {['Date','Revenue','Orders','Avg/Order'].map(h => (
                    <th key={h} className="print-muted" style={{ padding:'8px', textAlign:'left', color:C.m, fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.daily?.filter((d: any) => d.orders > 0).map((d: any) => (
                  <tr key={d.day} style={{ borderBottom:`1px solid ${C.b}` }}>
                    <td className="print-text" style={{ padding:'10px 8px', color:C.t }}>{new Date(d.day).toLocaleDateString('en-UG',{weekday:'short',day:'numeric',month:'short'})}</td>
                    <td className="print-text" style={{ padding:'10px 8px', color:C.br, fontWeight:'700' }}>{fmt(d.revenue)}</td>
                    <td className="print-text" style={{ padding:'10px 8px', color:C.t }}>{d.orders}</td>
                    <td className="print-muted" style={{ padding:'10px 8px', color:C.m }}>{d.orders > 0 ? fmt(d.revenue/d.orders) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top items */}
          {data.topItems?.length > 0 && (
            <div className="print-card" style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'14px', padding:'20px', marginBottom:'20px' }}>
              <h3 className="print-text" style={{ color:C.t, fontWeight:'700', marginBottom:'16px', fontSize:'15px' }}>Top Selling Items</h3>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.b}` }}>
                    {['#','Item','Qty Sold','Revenue'].map(h => (
                      <th key={h} className="print-muted" style={{ padding:'8px', textAlign:'left', color:C.m, fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((item: any, i: number) => (
                    <tr key={item.name} style={{ borderBottom:`1px solid ${C.b}` }}>
                      <td className="print-muted" style={{ padding:'10px 8px', color:'#52525b' }}>#{i+1}</td>
                      <td className="print-text" style={{ padding:'10px 8px', color:C.t, fontWeight:'500' }}>{item.name}</td>
                      <td className="print-text" style={{ padding:'10px 8px', color:C.t }}>{item.qty}</td>
                      <td className="print-text" style={{ padding:'10px 8px', color:C.br, fontWeight:'600' }}>{fmt(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment breakdown */}
          {data.paymentBreakdown?.length > 0 && (
            <div className="print-card" style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'14px', padding:'20px', marginBottom:'20px' }}>
              <h3 className="print-text" style={{ color:C.t, fontWeight:'700', marginBottom:'16px', fontSize:'15px' }}>Payment Methods</h3>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.b}` }}>
                    {['Method','Amount','Share'].map(h => (
                      <th key={h} className="print-muted" style={{ padding:'8px', textAlign:'left', color:C.m, fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.paymentBreakdown.map((p: any) => {
                    const total = data.paymentBreakdown.reduce((s: number, x: any) => s + x.amount, 0)
                    const pct = Math.round((p.amount / total) * 100)
                    return (
                      <tr key={p.method} style={{ borderBottom:`1px solid ${C.b}` }}>
                        <td className="print-text" style={{ padding:'10px 8px', color:C.t, fontWeight:'500' }}>{p.method.replace(/_/g,' ')}</td>
                        <td className="print-text" style={{ padding:'10px 8px', color:C.br, fontWeight:'600' }}>{fmt(p.amount)}</td>
                        <td className="print-text" style={{ padding:'10px 8px', color:C.t }}>{pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Print footer */}
          <div style={{ textAlign:'center', padding:'16px', color:'#52525b', fontSize:'11px' }}>
            Generated by RestoPOS · Powered by Brycore · {new Date().toLocaleString()}
          </div>
        </>}
      </div>
    </div>
  )
}
