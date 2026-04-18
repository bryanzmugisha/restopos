'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface BillItem { name: string; qty: number; price: number }
interface Bill { id: string; billNumber: string; orderNumber: string; tableNo?: string; orderId: string; items: BillItem[]; subtotal: number; tax: number; discount: number; total: number; status: string }

export default function BillingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [payMethod, setPayMethod] = useState('CASH')
  const [cashGiven, setCashGiven] = useState('')
  const [discountPct, setDiscountPct] = useState('0')
  const [processing, setProcessing] = useState(false)
  const [paid, setPaid] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?status=OPEN')
      if (res.ok) { const data = await res.json(); setOrders(Array.isArray(data) ? data : []) }
    } catch { console.error('Failed to fetch orders') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()

  const discountAmt = selected ? Math.round(selected.subtotal * (parseFloat(discountPct) / 100)) : 0
  const finalTotal = selected ? Math.round(selected.totalAmount - discountAmt) : 0
  const change = cashGiven ? Math.max(0, parseFloat(cashGiven) - finalTotal) : 0

  const processPayment = async () => {
    if (!selected) return
    setProcessing(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selected.id,
          subtotal: selected.subtotal,
          taxAmount: selected.taxAmount,
          discountAmount: discountAmt,
          totalAmount: finalTotal,
          payments: [{ method: payMethod, amount: finalTotal }],
        }),
      })
      if (res.ok) {
        setPaid(true)
        setOrders(o => o.filter(x => x.id !== selected.id))
        showToast('✅ Payment processed!')
      } else {
        const err = await res.json()
        showToast('❌ ' + err.error)
      }
    } catch { showToast('❌ Payment failed') }
    setProcessing(false)
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading orders...</div>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>💳 Billing</h1>
        <div style={{ display:'flex', gap:'16px' }}>
          <div style={{ textAlign:'center' }}><p style={{ fontSize:'20px', fontWeight:'700', color:'#ef4444' }}>{orders.length}</p><p style={{ fontSize:'11px', color:C.m }}>Open</p></div>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Orders list */}
        <div style={{ width:'280px', borderRight:`1px solid ${C.b}`, overflowY:'auto', padding:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px', padding:'0 4px' }}>
            <p style={{ fontSize:'12px', color:C.m }}>OPEN ORDERS</p>
            <button onClick={fetchOrders} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'13px' }}>↻</button>
          </div>
          {orders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px', color:'#52525b' }}>
              <p style={{ fontSize:'28px' }}>✅</p>
              <p style={{ fontSize:'13px', marginTop:'8px' }}>No open orders</p>
            </div>
          ) : orders.map(o => (
            <div key={o.id} onClick={() => { setSelected(o); setPaid(false); setDiscountPct('0'); setCashGiven('') }}
              style={{ padding:'12px', borderRadius:'10px', border:'1px solid', borderColor:selected?.id===o.id ? C.br : C.b, background:selected?.id===o.id ? '#1a0f00' : C.s, cursor:'pointer', marginBottom:'8px', transition:'all 0.12s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <p style={{ fontWeight:'700', color:C.t, fontSize:'14px' }}>{o.orderNumber}</p>
                {o.table && <span style={{ fontSize:'11px', background:'#27272a', color:'#a1a1aa', padding:'2px 7px', borderRadius:'999px' }}>Table {o.table.name}</span>}
              </div>
              <p style={{ fontSize:'12px', color:C.m, marginBottom:'6px' }}>{o.items?.length ?? 0} items · {o.orderType?.replace('_',' ')}</p>
              <p style={{ fontSize:'15px', fontWeight:'700', color:C.br }}>{fmt(o.totalAmount)}</p>
            </div>
          ))}
        </div>

        {/* Payment panel */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
          {!selected ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', color:'#52525b' }}>
              <p style={{ fontSize:'48px', marginBottom:'12px' }}>💳</p>
              <p style={{ fontSize:'16px' }}>Select an order to process payment</p>
            </div>
          ) : paid ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column' }}>
              <p style={{ fontSize:'64px', marginBottom:'16px' }}>✅</p>
              <p style={{ fontSize:'22px', fontWeight:'700', color:'#22c55e', marginBottom:'8px' }}>Payment Complete!</p>
              <p style={{ color:C.m }}>{selected.orderNumber} · {fmt(finalTotal)}</p>
              {change > 0 && <p style={{ color:C.br, fontWeight:'700', fontSize:'18px', marginTop:'8px' }}>Change: {fmt(change)}</p>}
              <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
                <button onClick={() => { setSelected(null); setPaid(false) }} style={{ flex:1, padding:'10px 24px', borderRadius:'10px', background:C.s, border:`1px solid ${C.b}`, color:C.t, cursor:'pointer', fontSize:'14px' }}>Next Order</button>
                <button onClick={() => window.open('/receipt', '_blank')} style={{ flex:1, padding:'10px 24px', borderRadius:'10px', background:'#22c55e', border:'none', color:'white', cursor:'pointer', fontSize:'14px', fontWeight:'700' }}>🖨️ Print Receipt</button>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth:'520px' }}>
              <div style={{ marginBottom:'20px' }}>
                <h2 style={{ fontSize:'20px', fontWeight:'700', color:C.t }}>{selected.orderNumber}</h2>
                <p style={{ color:C.m, fontSize:'13px' }}>{selected.table ? `Table ${selected.table.name}` : selected.orderType?.replace('_',' ')}</p>
              </div>

              {/* Items */}
              <div style={{ background:C.s, borderRadius:'12px', border:`1px solid ${C.b}`, marginBottom:'16px', overflow:'hidden' }}>
                {selected.items?.map((item: any, i: number) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'12px 14px', borderBottom:i < selected.items.length-1 ? `1px solid ${C.b}` : 'none' }}>
                    <div>
                      <p style={{ color:C.t, fontSize:'14px' }}>{item.menuItem?.name ?? item.name}</p>
                      <p style={{ color:C.m, fontSize:'12px' }}>{item.quantity} × {fmt(item.unitPrice)}</p>
                    </div>
                    <p style={{ color:C.t, fontWeight:'600' }}>{fmt(item.quantity * item.unitPrice)}</p>
                  </div>
                ))}
              </div>

              {/* Discount */}
              <div style={{ background:C.s, borderRadius:'12px', border:`1px solid ${C.b}`, padding:'14px', marginBottom:'16px' }}>
                <p style={{ color:'#a1a1aa', fontSize:'13px', marginBottom:'8px' }}>Discount</p>
                <div style={{ display:'flex', gap:'8px' }}>
                  {['0','5','10','15','20'].map(d => (
                    <button key={d} onClick={() => setDiscountPct(d)} style={{ flex:1, padding:'6px', borderRadius:'8px', border:'1px solid', borderColor:discountPct===d ? C.br : '#3f3f46', background:discountPct===d ? '#1a0f00' : 'transparent', color:discountPct===d ? C.br : C.m, cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>{d}%</button>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div style={{ background:C.s, borderRadius:'12px', border:`1px solid ${C.b}`, padding:'14px', marginBottom:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}><span style={{ color:C.m, fontSize:'14px' }}>Subtotal</span><span style={{ color:C.t }}>{fmt(selected.subtotal)}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}><span style={{ color:C.m, fontSize:'14px' }}>Tax</span><span style={{ color:C.t }}>{fmt(selected.taxAmount)}</span></div>
                {discountAmt > 0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}><span style={{ color:C.m, fontSize:'14px' }}>Discount ({discountPct}%)</span><span style={{ color:'#22c55e' }}>−{fmt(discountAmt)}</span></div>}
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'10px', borderTop:`1px solid ${C.b}` }}>
                  <span style={{ color:C.t, fontWeight:'700', fontSize:'16px' }}>Total</span>
                  <span style={{ color:C.br, fontWeight:'800', fontSize:'20px' }}>{fmt(finalTotal)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div style={{ background:C.s, borderRadius:'12px', border:`1px solid ${C.b}`, padding:'14px', marginBottom:'16px' }}>
                <p style={{ color:'#a1a1aa', fontSize:'13px', marginBottom:'10px' }}>Payment method</p>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {['CASH','CARD','MOBILE_MONEY','ROOM_FOLIO'].map(m => (
                    <button key={m} onClick={() => setPayMethod(m)} style={{ padding:'8px 14px', borderRadius:'8px', border:'1px solid', borderColor:payMethod===m ? C.br : '#3f3f46', background:payMethod===m ? '#1a0f00' : 'transparent', color:payMethod===m ? C.br : C.m, cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                      {m.replace('_',' ')}
                    </button>
                  ))}
                </div>
                {payMethod === 'CASH' && (
                  <div style={{ marginTop:'12px' }}>
                    <label style={{ display:'block', color:'#a1a1aa', fontSize:'13px', marginBottom:'6px' }}>Cash given</label>
                    <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="Enter amount..."
                      style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'15px', outline:'none' }} />
                    {cashGiven && parseFloat(cashGiven) >= finalTotal && <p style={{ marginTop:'8px', color:'#22c55e', fontWeight:'700' }}>Change: {fmt(change)}</p>}
                  </div>
                )}
              </div>

              <button onClick={processPayment} disabled={processing} style={{ width:'100%', padding:'15px', borderRadius:'12px', background:C.br, border:'none', color:'white', fontSize:'16px', fontWeight:'700', cursor:'pointer', opacity:processing ? 0.7 : 1 }}>
                {processing ? 'Processing...' : `✅ Confirm Payment — ${fmt(finalTotal)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
