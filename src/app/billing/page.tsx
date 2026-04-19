'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface OrderItem { id: string; menuItemId: string; name: string; quantity: number; unitPrice: number; totalPrice: number }
interface Order {
  id: string; orderNumber: string; orderType: string; status: string
  table?: { name: string }; customer?: { name: string; phone?: string }
  waiter?: { name: string }
  items: OrderItem[]; subtotal: number; taxAmount: number; totalAmount: number
  createdAt: string; bills: { status: string }[]
}

const PAYMENT_METHODS = ['CASH','CARD','MOBILE_MONEY','BANK_TRANSFER','CREDIT']

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order|null>(null)
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percent'|'amount'>('percent')
  const [payments, setPayments] = useState<{method: string; amount: number; reference: string}[]>([{ method:'CASH', amount:0, reference:'' }])
  const [processing, setProcessing] = useState(false)
  const [paid, setPaid] = useState(false)
  const [lastBillId, setLastBillId] = useState('')
  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const showToast = (msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(''), 3500) }
  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?status=OPEN,IN_PROGRESS,READY')
      if (res.ok) {
        const data = await res.json()
        const open = Array.isArray(data) ? data.filter((o: Order) => ['OPEN','IN_PROGRESS','READY'].includes(o.status)) : []
        setOrders(open)
      }
    } catch { console.error('Failed to fetch') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Calculate totals
  const subtotal = selected ? selected.subtotal : 0
  const tax = selected ? selected.taxAmount : 0
  const discAmt = discountType === 'percent'
    ? Math.round((subtotal + tax) * (discount / 100))
    : Math.min(discount, subtotal + tax)
  const total = Math.max(0, subtotal + tax - discAmt)
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const change = Math.max(0, totalPaid - total)
  const remaining = Math.max(0, total - totalPaid)

  const selectOrder = (order: Order) => {
    setSelected(order)
    setPaid(false)
    setDiscount(0)
    setPayments([{ method: 'CASH', amount: order.totalAmount, reference: '' }])
  }

  const addPayment = () => setPayments(p => [...p, { method: 'CASH', amount: remaining, reference: '' }])
  const removePayment = (i: number) => setPayments(p => p.filter((_, idx) => idx !== i))

  const processBill = async () => {
    if (!selected) return
    if (totalPaid < total) { showToast('❌ Amount paid is less than total', false); return }
    setProcessing(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selected.id,
          subtotal, taxAmount: tax,
          discountAmount: discAmt,
          totalAmount: total,
          amountPaid: totalPaid,
          changeGiven: change,
          payments: payments.filter(p => p.amount > 0),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setLastBillId(data.id ?? '')
        setPaid(true)
        setOrders(o => o.filter(x => x.id !== selected.id))
        showToast(`✅ Bill processed — ${fmt(change)} change`)
      } else showToast('❌ ' + (data.detail || data.error), false)
    } catch (e: any) { showToast('❌ ' + (e?.message || 'Error'), false) }
    setProcessing(false)
  }

  const filtered = orders.filter(o =>
    o.orderNumber.toLowerCase().includes(q.toLowerCase()) ||
    (o.table?.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (o.customer?.name ?? '').toLowerCase().includes(q.toLowerCase())
  )

  const C = { bg: '#09090b', s: '#18181b', b: '#27272a', t: '#fafafa', m: '#71717a', br: '#f97316' }

  return (
    <div className="page-root">
      {toast && <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: toastOk ? '#14532d' : '#450a0a', border: `1px solid ${toastOk ? '#22c55e' : '#7f1d1d'}`, borderRadius: '10px', padding: '12px 24px', color: toastOk ? '#22c55e' : '#fca5a5', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.m, cursor: 'pointer', fontSize: '20px' }}>←</button>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: C.t, flex: 1 }}>💰 Billing & Payments</h1>
        <button onClick={fetchOrders} style={{ padding: '7px 12px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.m, cursor: 'pointer', fontSize: '12px' }}>🔄 Refresh</button>
      </div>

      <div className="two-panel">

        {/* Orders list */}
        <div className='panel-left' style={{ width: 'min(320px, 100vw)', minWidth: '0', flexShrink: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.b}` }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search orders..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <p style={{ color: C.m, padding: '20px', textAlign: 'center' }}>Loading...</p>
              : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#52525b' }}>
                  <p style={{ fontSize: '32px' }}>🎉</p>
                  <p style={{ color: C.m }}>No open orders</p>
                </div>
              ) : filtered.map(order => (
                <div key={order.id} onClick={() => selectOrder(order)}
                  style={{ padding: '12px 14px', borderBottom: `1px solid ${C.b}`, cursor: 'pointer', background: selected?.id === order.id ? '#1a0f00' : 'transparent', borderLeft: `3px solid ${selected?.id === order.id ? C.br : 'transparent'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: C.t, fontWeight: '700', fontSize: '14px' }}>{order.orderNumber}</span>
                    <span style={{ color: C.br, fontWeight: '700', fontSize: '14px' }}>{fmt(order.totalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.m, fontSize: '12px' }}>
                      {order.table ? `🪑 ${order.table.name}` : `🛍️ ${order.orderType.replace('_',' ')}`}
                      {order.customer ? ` · ${order.customer.name}` : ''}
                    </span>
                    <span style={{ color: C.m, fontSize: '11px' }}>{order.items.length} items</span>
                  </div>
                  {order.waiter && <p style={{ color: '#52525b', fontSize: '11px', margin: '2px 0 0' }}>👤 {order.waiter.name}</p>}
                </div>
              ))}
          </div>
        </div>

        {/* Billing panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#52525b' }}>
              <p style={{ fontSize: '48px' }}>💰</p>
              <p style={{ fontSize: '16px', color: C.m }}>Select an order to process payment</p>
            </div>
          ) : paid ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '64px' }}>✅</div>
              <h2 style={{ color: C.t, fontWeight: '700', fontSize: '22px', margin: 0 }}>Payment Complete!</h2>
              <p style={{ color: '#22c55e', fontSize: '18px', fontWeight: '700' }}>{fmt(total)} received</p>
              {change > 0 && <div style={{ padding: '12px 24px', borderRadius: '12px', background: '#14532d', border: '1px solid #22c55e' }}>
                <p style={{ color: '#22c55e', fontWeight: '800', fontSize: '20px', margin: 0 }}>Change: {fmt(change)}</p>
              </div>}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => { setSelected(null); setPaid(false) }}
                  style={{ padding: '11px 20px', borderRadius: '10px', background: C.s, border: `1px solid ${C.b}`, color: C.t, cursor: 'pointer', fontWeight: '600' }}>
                  Next Order
                </button>
                <button onClick={() => window.open(`/receipt?id=${lastBillId}`, '_blank')}
                  style={{ padding: '11px 20px', borderRadius: '10px', background: '#1e3a5f', border: '1px solid #3b82f6', color: '#60a5fa', cursor: 'pointer', fontWeight: '700' }}>
                  🖨️ Print Receipt
                </button>
                <button onClick={() => {
                  const url = `/receipt?id=${lastBillId}`
                  const el = document.createElement('a')
                  el.href = url; el.target = '_blank'; el.click()
                }} style={{ padding: '11px 20px', borderRadius: '10px', background: '#052e16', border: '1px solid #22c55e', color: '#22c55e', cursor: 'pointer', fontWeight: '700' }}>
                  📱 WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className='scroll-area' style={{ padding: '16px' }}>
              {/* Order summary */}
              <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <p style={{ color: C.t, fontWeight: '700', fontSize: '16px', margin: '0 0 3px' }}>{selected.orderNumber}</p>
                    <p style={{ color: C.m, fontSize: '13px', margin: 0 }}>
                      {selected.table ? `🪑 Table ${selected.table.name}` : `🛍️ ${selected.orderType.replace('_',' ')}`}
                      {selected.customer ? ` · 👤 ${selected.customer.name}` : ''}
                    </p>
                  </div>
                  <p style={{ color: C.br, fontWeight: '800', fontSize: '20px', margin: 0 }}>{fmt(selected.totalAmount)}</p>
                </div>
                <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: '10px' }}>
                  {selected.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ color: C.t, fontSize: '13px' }}>{item.name} ×{item.quantity}</span>
                      <span style={{ color: C.m, fontSize: '13px' }}>{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <p style={{ color: C.t, fontWeight: '600', fontSize: '14px', marginBottom: '10px' }}>Discount</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={() => setDiscountType('percent')} style={{ padding: '6px 12px', borderRadius: '7px', border: `1px solid ${discountType === 'percent' ? C.br : C.b}`, background: discountType === 'percent' ? '#1a0f00' : 'transparent', color: discountType === 'percent' ? C.br : C.m, cursor: 'pointer', fontSize: '12px' }}>%</button>
                  <button onClick={() => setDiscountType('amount')} style={{ padding: '6px 12px', borderRadius: '7px', border: `1px solid ${discountType === 'amount' ? C.br : C.b}`, background: discountType === 'amount' ? '#1a0f00' : 'transparent', color: discountType === 'amount' ? C.br : C.m, cursor: 'pointer', fontSize: '12px' }}>UGX</button>
                  <input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" min="0"
                    style={{ flex: 1, padding: '7px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }} />
                  {discAmt > 0 && <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: '600' }}>-{fmt(discAmt)}</span>}
                </div>
              </div>

              {/* Payment */}
              <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ color: C.t, fontWeight: '600', fontSize: '14px', margin: 0 }}>Payment</p>
                  <button onClick={addPayment} style={{ fontSize: '12px', color: C.br, background: 'none', border: 'none', cursor: 'pointer' }}>+ Split</button>
                </div>
                {payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <select value={p.method} onChange={e => setPayments(ps => ps.map((x, j) => j === i ? { ...x, method: e.target.value } : x))}
                      style={{ padding: '8px 10px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '13px', outline: 'none' }}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                    </select>
                    <input type="number" value={p.amount || ''} onChange={e => setPayments(ps => ps.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
                      placeholder="Amount" style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }} />
                    {i > 0 && <button onClick={() => removePayment(i)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#450a0a', color: '#ef4444', cursor: 'pointer' }}>✕</button>}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                {[
                  ['Subtotal', subtotal],
                  ['Tax (18%)', tax],
                  discAmt > 0 ? ['Discount', -discAmt] : null,
                ].filter(Boolean).map((r: any) => (
                  <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: C.m, fontSize: '14px' }}>{r[0]}</span>
                    <span style={{ color: r[1] < 0 ? '#22c55e' : C.t, fontSize: '14px' }}>{fmt(Math.abs(r[1]))}{r[1] < 0 ? ' off' : ''}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: '10px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: C.t, fontWeight: '700', fontSize: '18px' }}>Total</span>
                    <span style={{ color: C.br, fontWeight: '800', fontSize: '20px' }}>{fmt(total)}</span>
                  </div>
                  {totalPaid > 0 && <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: C.m, fontSize: '13px' }}>Paid</span>
                      <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: '600' }}>{fmt(totalPaid)}</span>
                    </div>
                    {remaining > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#ef4444', fontSize: '13px' }}>Remaining</span>
                      <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>{fmt(remaining)}</span>
                    </div>}
                    {change > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '14px' }}>Change</span>
                      <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '16px' }}>{fmt(change)}</span>
                    </div>}
                  </>}
                </div>
              </div>

              <button onClick={processBill} disabled={processing || totalPaid < total}
                style={{ width: '100%', padding: '15px', borderRadius: '12px', background: totalPaid >= total ? C.br : '#27272a', border: 'none', color: 'white', cursor: totalPaid >= total ? 'pointer' : 'not-allowed', fontWeight: '800', fontSize: '16px', opacity: processing ? 0.7 : 1 }}>
                {processing ? 'Processing...' : totalPaid < total ? `Still owe ${fmt(remaining)}` : `✅ Process Payment — ${fmt(total)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
