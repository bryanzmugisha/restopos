'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface OrderItem { name: string; quantity: number; unitPrice: number; totalPrice: number }
interface Order {
  id: string; orderNumber: string; orderType: string; status: string
  table?: { name: string }; customer?: { name: string; phone?: string }
  waiter?: { name: string; role: string }
  items: OrderItem[]; subtotal: number; taxAmount: number; totalAmount: number
  createdAt: string; updatedAt: string
  bills: { id: string; status: string; totalAmount: number; paidAt?: string; billNumber: string }[]
  kots: { status: string; station?: string }[]
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CREDIT']

const orderStatusConfig: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  OPEN:        { color: '#3b82f6', bg: '#0f172a', label: 'Open',        icon: '🔵' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#1c1200', label: 'Preparing',   icon: '🟡' },
  READY:       { color: '#22c55e', bg: '#052e16', label: 'Ready',       icon: '🟢' },
  COMPLETED:   { color: '#71717a', bg: '#18181b', label: 'Paid & Done', icon: '✅' },
  CANCELLED:   { color: '#ef4444', bg: '#450a0a', label: 'Cancelled',   icon: '❌' },
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [tab, setTab] = useState<'active'|'all'>('active')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percent'|'amount'>('percent')
  const [payments, setPayments] = useState<{ method: string; amount: number; reference: string }[]>([{ method: 'CASH', amount: 0, reference: '' }])
  const [processing, setProcessing] = useState(false)
  const [paid, setPaid] = useState(false)
  const [lastBillId, setLastBillId] = useState('')
  const [lastBillNumber, setLastBillNumber] = useState('')
  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)
  const [q, setQ] = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const showToast = (msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(''), 4000) }
  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        setAllOrders(Array.isArray(data) ? data : [])
        setLastRefresh(new Date())
      }
    } catch { console.error('Failed') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const i = setInterval(fetchOrders, 10000)
    return () => clearInterval(i)
  }, [fetchOrders])

  // Filter orders by tab
  const activeOrders = allOrders.filter(o => ['OPEN', 'IN_PROGRESS', 'READY'].includes(o.status))
  const displayOrders = tab === 'active' ? activeOrders : allOrders

  const filtered = displayOrders.filter(o =>
    o.orderNumber.toLowerCase().includes(q.toLowerCase()) ||
    (o.table?.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (o.customer?.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (o.waiter?.name ?? '').toLowerCase().includes(q.toLowerCase())
  )

  // Totals
  const subtotal = selected ? selected.subtotal : 0
  const tax = selected ? selected.taxAmount : 0
  const discAmt = discountType === 'percent'
    ? Math.round((subtotal + tax) * (discount / 100))
    : Math.min(discount, subtotal + tax)
  const total = Math.max(0, subtotal + tax - discAmt)
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const change = Math.max(0, totalPaid - total)
  const remaining = Math.max(0, total - totalPaid)

  const selectOrder = (order: Order) => {
    if (order.status === 'COMPLETED') {
      // Show completed order info but don't allow re-billing
      setSelected(order); setPaid(true)
      const bill = order.bills[0]
      setLastBillId(bill?.id ?? '')
      setLastBillNumber(bill?.billNumber ?? '')
      return
    }
    setSelected(order); setPaid(false)
    setDiscount(0)
    setPayments([{ method: 'CASH', amount: order.totalAmount, reference: '' }])
  }

  const processBill = async () => {
    if (!selected) return
    if (totalPaid < total) { showToast('❌ Amount paid is less than total', false); return }
    setProcessing(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selected.id, subtotal, taxAmount: tax,
          discountAmount: discAmt, totalAmount: total,
          amountPaid: totalPaid, changeGiven: change,
          payments: payments.filter(p => Number(p.amount) > 0),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        const billId = data.id ?? ''
        const billNum = data.billNumber ?? ''
        setLastBillId(billId); setLastBillNumber(billNum); setPaid(true)
        // Mark order as COMPLETED in local state
        setAllOrders(o => o.map(x => x.id === selected.id ? { ...x, status: 'COMPLETED', bills: [{ id: billId, status: 'PAID', totalAmount: total, billNumber: billNum }] } : x))
        showToast(`✅ ${billNum} — Change: ${fmt(change)}`)
        // Auto-open receipt
        if (billId) setTimeout(() => window.open(`/receipt?id=${billId}`, '_blank'), 1500)
        fetchOrders()
      } else showToast('❌ ' + (data.detail || data.error), false)
    } catch (e: any) { showToast('❌ ' + (e?.message || 'Error'), false) }
    setProcessing(false)
  }

  const C = { bg: '#09090b', s: '#18181b', b: '#27272a', t: '#fafafa', m: '#71717a', br: '#f97316' }
  const roleColor: Record<string, string> = { WAITER: '#f97316', CASHIER: '#22c55e', BAR_STAFF: '#6366f1', ADMIN: '#a855f7', MANAGER: '#3b82f6' }

  const getOrderBadge = (order: Order) => {
    const hasBill = order.bills.some(b => b.status === 'PAID')
    if (hasBill || order.status === 'COMPLETED') return { label: 'PAID', color: '#22c55e', bg: '#052e16' }
    if (order.status === 'READY') return { label: 'READY TO PAY', color: '#22c55e', bg: '#052e16' }
    if (order.status === 'IN_PROGRESS') return { label: 'PREPARING', color: '#f59e0b', bg: '#1c1200' }
    return { label: 'OPEN', color: '#3b82f6', bg: '#0f172a' }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 'max(12px,env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toastOk ? '#14532d' : '#450a0a', border: `1px solid ${toastOk ? '#22c55e' : '#7f1d1d'}`, borderRadius: '10px', padding: '11px 20px', color: toastOk ? '#22c55e' : '#fca5a5', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, paddingTop: 'max(10px,env(safe-area-inset-top))' }}>
        <button onClick={() => router.push('/dashboard')} style={{ width: '36px', height: '36px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <h1 style={{ fontSize: '16px', fontWeight: '700', color: C.t, flex: 1, margin: 0 }}>💰 Billing</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: C.m }}>Updated {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={fetchOrders} style={{ padding: '6px 10px', borderRadius: '7px', background: C.s, border: `1px solid ${C.b}`, color: C.m, cursor: 'pointer', fontSize: '12px' }}>↻</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, overflowX: 'auto' }}>
        {[
          { label: 'Ready to Pay', count: allOrders.filter(o => o.status === 'READY').length, color: '#22c55e' },
          { label: 'Open', count: allOrders.filter(o => o.status === 'OPEN').length, color: '#3b82f6' },
          { label: 'Preparing', count: allOrders.filter(o => o.status === 'IN_PROGRESS').length, color: '#f59e0b' },
          { label: 'Paid Today', count: allOrders.filter(o => o.status === 'COMPLETED').length, color: '#71717a' },
        ].map(s => (
          <div key={s.label} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '8px', padding: '6px 12px', flexShrink: 0, textAlign: 'center' }}>
            <p style={{ fontSize: '18px', fontWeight: '800', color: s.color, margin: 0 }}>{s.count}</p>
            <p style={{ fontSize: '10px', color: C.m, margin: 0, whiteSpace: 'nowrap' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left — Orders list */}
        <div style={{ width: 'min(320px, 45vw)', borderRight: `1px solid ${C.b}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Search + Tabs */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search order, table, staff..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, fontSize: '12px', outline: 'none', marginBottom: '6px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['active', 'all'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '5px', borderRadius: '6px', border: `1px solid ${tab === t ? C.br : C.b}`, background: tab === t ? '#1a0f00' : 'transparent', color: tab === t ? C.br : C.m, cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                  {t === 'active' ? `Active (${activeOrders.length})` : `All (${allOrders.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Order list */}
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            {loading ? (
              <p style={{ color: C.m, padding: '20px', textAlign: 'center', fontSize: '13px' }}>Loading...</p>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#52525b' }}>
                <p style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</p>
                <p style={{ fontSize: '13px', color: C.m }}>No orders found</p>
              </div>
            ) : filtered.map(order => {
              const badge = getOrderBadge(order)
              const isPaid = order.status === 'COMPLETED' || order.bills.some(b => b.status === 'PAID')
              return (
                <div key={order.id} onClick={() => selectOrder(order)}
                  style={{ padding: '10px 12px', borderBottom: `1px solid ${C.b}`, cursor: 'pointer', background: selected?.id === order.id ? '#1a0f00' : isPaid ? '#0d0d0d' : 'transparent', borderLeft: `3px solid ${selected?.id === order.id ? C.br : isPaid ? '#22c55e' : order.status === 'READY' ? '#22c55e' : 'transparent'}`, opacity: isPaid ? 0.7 : 1 }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: C.t, fontWeight: '700', fontSize: '13px' }}>{order.orderNumber}</span>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </div>
                      <p style={{ color: C.m, fontSize: '11px', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.table ? `🪑 ${order.table.name}` : `🛍️ ${order.orderType.replace('_', ' ')}`}
                        {order.customer ? ` · 👤 ${order.customer.name}` : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                      <p style={{ color: isPaid ? '#22c55e' : C.br, fontWeight: '700', fontSize: '13px', margin: 0 }}>{fmt(order.totalAmount)}</p>
                      {isPaid && <p style={{ color: '#22c55e', fontSize: '10px', margin: '1px 0 0' }}>✅ CLEARED</p>}
                    </div>
                  </div>

                  {/* Staff info - who placed the order */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: roleColor[order.waiter?.role ?? ''] ?? '#52525b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                        {order.waiter?.name?.charAt(0) ?? '?'}
                      </div>
                      <span style={{ fontSize: '10px', color: '#52525b' }}>{order.waiter?.name ?? 'Unknown'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={e => { e.stopPropagation(); window.open(`/invoice?orderId=${order.id}`, '_blank') }}
                        style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#1e3a5f', border: '1px solid #3b82f6', color: '#60a5fa', cursor: 'pointer' }}>📋 Invoice</button>
                      {isPaid && (
                        <button onClick={e => { e.stopPropagation(); window.open(`/receipt?id=${order.bills[0]?.id ?? ''}`, '_blank') }}
                          style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#052e16', border: '1px solid #22c55e', color: '#22c55e', cursor: 'pointer' }}>🧾 Receipt</button>
                      )}
                    </div>
                  </div>

                  {/* Items preview */}
                  <p style={{ color: '#3f3f46', fontSize: '10px', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.items.slice(0, 3).map(i => `${i.name} ×${i.quantity}`).join(' · ')}
                    {order.items.length > 3 ? ` +${order.items.length - 3} more` : ''}
                  </p>
                </div>
              )
            })}
            <div style={{ height: '60px' }} />
          </div>
        </div>

        {/* Right — Billing panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#52525b' }}>
              <p style={{ fontSize: '40px' }}>💰</p>
              <p style={{ fontSize: '14px', color: C.m }}>Select an order to process</p>
              <p style={{ fontSize: '12px', color: '#3f3f46', textAlign: 'center', maxWidth: '200px' }}>Auto-refreshes every 10s — all staff orders appear here</p>
            </div>
          ) : paid ? (
            /* Paid state */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', padding: '20px' }}>
              <div style={{ fontSize: '56px' }}>✅</div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#22c55e', fontWeight: '700', fontSize: '20px', margin: '0 0 4px' }}>Order Cleared!</h2>
                <p style={{ color: C.m, fontSize: '14px', margin: '0 0 2px' }}>{lastBillNumber || selected.bills[0]?.billNumber}</p>
                <p style={{ color: '#52525b', fontSize: '12px', margin: 0 }}>✅ Marked as PAID & DONE</p>
              </div>
              {change > 0 && (
                <div style={{ padding: '12px 24px', borderRadius: '12px', background: '#14532d', border: '1px solid #22c55e', textAlign: 'center' }}>
                  <p style={{ color: '#22c55e', fontWeight: '800', fontSize: '20px', margin: 0 }}>Change: {fmt(change)}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => { setSelected(null); setPaid(false) }} style={{ padding: '10px 18px', borderRadius: '10px', background: C.s, border: `1px solid ${C.b}`, color: C.t, cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Next Order</button>
                <button onClick={() => window.open(`/receipt?id=${lastBillId || selected.bills[0]?.id}`, '_blank')} style={{ padding: '10px 18px', borderRadius: '10px', background: '#1e3a5f', border: '1px solid #3b82f6', color: '#60a5fa', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>🖨️ Print Receipt</button>
                <button onClick={() => window.open(`/receipt?id=${lastBillId || selected.bills[0]?.id}`, '_blank')} style={{ padding: '10px 18px', borderRadius: '10px', background: '#052e16', border: '1px solid #22c55e', color: '#22c55e', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>📱 WhatsApp</button>
              </div>
            </div>
          ) : (
            /* Payment form */
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '14px' }}>

              {/* Order summary */}
              <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ color: C.t, fontWeight: '700', fontSize: '15px', margin: '0 0 2px' }}>{selected.orderNumber}</p>
                    <p style={{ color: C.m, fontSize: '12px', margin: '0 0 4px' }}>
                      {selected.table ? `🪑 Table ${selected.table.name}` : `🛍️ ${selected.orderType.replace('_', ' ')}`}
                      {selected.customer ? ` · 👤 ${selected.customer.name}` : ''}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: roleColor[selected.waiter?.role ?? ''] ?? '#52525b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'white', fontWeight: '700' }}>
                        {selected.waiter?.name?.charAt(0) ?? '?'}
                      </div>
                      <span style={{ fontSize: '11px', color: C.m }}>By {selected.waiter?.name ?? 'Unknown'}</span>
                    </div>
                  </div>
                  <p style={{ color: C.br, fontWeight: '800', fontSize: '20px', margin: 0 }}>{fmt(selected.totalAmount)}</p>
                </div>
                <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: '10px' }}>
                  {selected.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: C.t, fontSize: '13px' }}>{item.name} ×{item.quantity}</span>
                      <span style={{ color: C.m, fontSize: '13px' }}>{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                <p style={{ color: C.t, fontWeight: '600', fontSize: '13px', margin: '0 0 10px' }}>Discount</p>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => setDiscountType('percent')} style={{ padding: '6px 12px', borderRadius: '7px', border: `1px solid ${discountType === 'percent' ? C.br : C.b}`, background: discountType === 'percent' ? '#1a0f00' : 'transparent', color: discountType === 'percent' ? C.br : C.m, cursor: 'pointer', fontSize: '12px' }}>%</button>
                  <button onClick={() => setDiscountType('amount')} style={{ padding: '6px 12px', borderRadius: '7px', border: `1px solid ${discountType === 'amount' ? C.br : C.b}`, background: discountType === 'amount' ? '#1a0f00' : 'transparent', color: discountType === 'amount' ? C.br : C.m, cursor: 'pointer', fontSize: '12px' }}>UGX</button>
                  <input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" min="0"
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }} />
                  {discAmt > 0 && <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>-{fmt(discAmt)}</span>}
                </div>
              </div>

              {/* Payment methods */}
              <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p style={{ color: C.t, fontWeight: '600', fontSize: '13px', margin: 0 }}>Payment</p>
                  <button onClick={() => setPayments(p => [...p, { method: 'CASH', amount: remaining, reference: '' }])} style={{ fontSize: '11px', color: C.br, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>+ Split Payment</button>
                </div>
                {payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                    <select value={p.method} onChange={e => setPayments(ps => ps.map((x, j) => j === i ? { ...x, method: e.target.value } : x))}
                      style={{ padding: '8px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '12px', outline: 'none', flexShrink: 0 }}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                    </select>
                    <input type="number" value={p.amount || ''} onChange={e => setPayments(ps => ps.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
                      placeholder="Amount" style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', minWidth: 0 }} />
                    {i > 0 && <button onClick={() => setPayments(p => p.filter((_, idx) => idx !== i))} style={{ padding: '6px 8px', borderRadius: '6px', border: 'none', background: '#450a0a', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>✕</button>}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                {[
                  ['Subtotal', subtotal, ''],
                  ['Tax (18%)', tax, ''],
                  discAmt > 0 ? ['Discount', -discAmt, '#22c55e'] : null,
                ].filter(Boolean).map((r: any) => (
                  <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: C.m, fontSize: '13px' }}>{r[0]}</span>
                    <span style={{ color: r[2] || C.t, fontSize: '13px' }}>{r[1] < 0 ? `-${fmt(Math.abs(r[1]))}` : fmt(r[1])}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: '10px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: C.t, fontWeight: '700', fontSize: '17px' }}>Total</span>
                    <span style={{ color: C.br, fontWeight: '800', fontSize: '19px' }}>{fmt(total)}</span>
                  </div>
                  {totalPaid > 0 && <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: C.m, fontSize: '12px' }}>Tendered</span>
                      <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: '600' }}>{fmt(totalPaid)}</span>
                    </div>
                    {remaining > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>Remaining</span>
                      <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700' }}>{fmt(remaining)}</span>
                    </div>}
                    {change > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', background: '#14532d', marginTop: '4px' }}>
                      <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '15px' }}>Change</span>
                      <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '17px' }}>{fmt(change)}</span>
                    </div>}
                  </>}
                </div>
              </div>

              {/* Process button */}
              <button onClick={processBill} disabled={processing || totalPaid < total}
                style={{ width: '100%', padding: '15px', borderRadius: '12px', background: totalPaid >= total ? C.br : '#27272a', border: 'none', color: 'white', cursor: totalPaid >= total ? 'pointer' : 'not-allowed', fontWeight: '800', fontSize: '16px', opacity: processing ? 0.7 : 1, marginBottom: '80px' }}>
                {processing ? 'Processing...' : totalPaid < total ? `Still owe ${fmt(remaining)}` : `✅ Clear Order — ${fmt(total)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
