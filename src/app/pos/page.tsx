'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface MenuItem { id: string; name: string; price: number; categoryId: string; isActive: boolean }
interface Category { id: string; name: string; station?: string }
interface Table { id: string; name: string; status: string; capacity: number }
interface Floor { id: string; name: string; tables: Table[] }
interface Customer { id: string; name: string; phone?: string; loyaltyPoints: number }
interface CartItem { menuItemId: string; name: string; price: number; quantity: number; notes?: string }

export default function POSPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCat, setActiveCat] = useState('all')
  const [orderType, setOrderType] = useState<'DINE_IN'|'TAKEAWAY'|'DELIVERY'>('DINE_IN')
  const [tableId, setTableId] = useState('')
  const [customer, setCustomer] = useState<Customer|null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })
  const [q, setQ] = useState('')
  const [placing, setPlacing] = useState(false)
  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)
  const [showCart, setShowCart] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [notes, setNotes] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchAll = useCallback(async () => {
    const [catRes, itemRes, tableRes] = await Promise.all([
      fetch('/api/menu/categories'), fetch('/api/menu/items'), fetch('/api/tables'),
    ])
    if (catRes.ok) setCategories(await catRes.json())
    if (itemRes.ok) setMenuItems(await itemRes.json())
    if (tableRes.ok) setFloors(await tableRes.json())
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const showToast = (msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(''), 3500) }

  const fmt = (n: number) => 'UGX ' + n.toLocaleString()

  // Customer search
  const searchCustomer = async (q: string) => {
    setCustomerSearch(q)
    if (q.length < 2) { setCustomerResults([]); return }
    setSearchingCustomer(true)
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`)
      if (res.ok) setCustomerResults(await res.json())
    } catch { console.error('Search failed') }
    setSearchingCustomer(false)
  }

  const addCustomer = async () => {
    if (!newCustomer.name) return
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      })
      if (res.ok) {
        const c = await res.json()
        setCustomer(c); setShowCustomerModal(false); setNewCustomer({ name: '', phone: '' })
        showToast(`✅ ${c.name} added & linked`)
      }
    } catch { showToast('❌ Failed to add customer', false) }
  }

  // Cart
  const addToCart = (item: MenuItem) => {
    setCart(c => {
      const ex = c.find(i => i.menuItemId === item.id)
      if (ex) return c.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...c, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }
  const updateQty = (id: string, delta: number) => {
    setCart(c => c.map(i => i.menuItemId === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0))
  }
  const removeItem = (id: string) => setCart(c => c.filter(i => i.menuItemId !== id))

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * 0.18)
  const total = subtotal + tax
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const placeOrder = async () => {
    if (cart.length === 0) { showToast('❌ Add items first', false); return }
    if (orderType === 'DINE_IN' && !tableId) { showToast('❌ Select a table for dine-in', false); return }
    setPlacing(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType,
          tableId: tableId || null,
          customerId: customer?.id || null,
          items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, unitPrice: i.price, notes: i.notes })),
          notes, subtotal, taxAmount: tax, totalAmount: total,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCart([]); setTableId(''); setCustomer(null); setNotes(''); setShowCart(false)
        showToast(`✅ ${data.orderNumber} — KOT sent!
📋 Send invoice? Click to open`)
        // Auto-offer invoice after 1s
        setTimeout(() => {
          if (confirm(`Order ${data.orderNumber} placed!

Send invoice to customer now?`)) {
            window.open(`/invoice?orderId=${data.id}`, '_blank')
          }
        }, 500)
      } else showToast('❌ ' + (data.detail || data.error), false)
    } catch (e: any) { showToast('❌ ' + (e?.message || 'Error'), false) }
    setPlacing(false)
  }

  const filtered = menuItems.filter(i =>
    i.isActive &&
    (activeCat === 'all' || i.categoryId === activeCat) &&
    i.name.toLowerCase().includes(q.toLowerCase())
  )

  const allTables = floors.flatMap(f => f.tables)
  const vacantTables = allTables.filter(t => t.status === 'VACANT')

  const C = { bg: '#09090b', s: '#18181b', b: '#27272a', t: '#fafafa', m: '#71717a', br: '#f97316' }

  return (
    <div className="page-root">
      {toast && (
        <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toastOk ? '#14532d' : '#450a0a', border: `1px solid ${toastOk ? '#22c55e' : '#7f1d1d'}`, borderRadius: '10px', padding: '12px 24px', color: toastOk ? '#22c55e' : '#fca5a5', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.m, cursor: 'pointer', fontSize: '20px', padding: '4px' }}>←</button>
        <h1 style={{ fontSize: '16px', fontWeight: '700', color: C.t, flex: 1, margin: 0 }}>🧾 New Order</h1>

        {/* Order type */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map(t => (
            <button key={t} onClick={() => { setOrderType(t); if (t !== 'DINE_IN') setTableId('') }}
              style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${orderType === t ? C.br : C.b}`, background: orderType === t ? '#1a0f00' : 'transparent', color: orderType === t ? C.br : C.m, cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
              {t === 'DINE_IN' ? '🪑 Dine In' : t === 'TAKEAWAY' ? '🛍️ Takeaway' : '🚚 Delivery'}
            </button>
          ))}
        </div>

        {/* Cart button mobile */}
        {cartCount > 0 && (
          <button onClick={() => setShowCart(true)} style={{ padding: '8px 14px', borderRadius: '9px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '13px', position: 'relative' }}>
            🛒 {cartCount} · {fmt(total)}
          </button>
        )}
      </div>

      <div className="pos-layout">
        {/* Left — Menu */}
        <div className="pos-menu">

          {/* Table + Customer selectors */}
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.b}`, display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            {orderType === 'DINE_IN' && (
              <select value={tableId} onChange={e => setTableId(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', background: tableId ? '#1a0f00' : C.s, border: `1px solid ${tableId ? C.br : C.b}`, color: tableId ? C.br : C.m, fontSize: '13px', outline: 'none', cursor: 'pointer', flex: 1, minWidth: '120px' }}>
                <option value="">🪑 Select Table</option>
                {floors.map(floor => (
                  <optgroup key={floor.id} label={floor.name}>
                    {floor.tables.filter(t => t.status === 'VACANT' || t.id === tableId).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.capacity} seats)</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}

            {/* Customer selector */}
            <button onClick={() => setShowCustomerModal(true)}
              style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${customer ? '#22c55e' : C.b}`, background: customer ? '#052e16' : C.s, color: customer ? '#22c55e' : C.m, cursor: 'pointer', fontSize: '13px', flex: 1, minWidth: '140px', textAlign: 'left', fontWeight: customer ? '600' : '400' }}>
              {customer ? `👤 ${customer.name}` : '👤 Link Customer (optional)'}
            </button>
            {customer && (
              <button onClick={() => setCustomer(null)} style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${C.b}`, background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>✕</button>
            )}
          </div>

          {/* Search + categories */}
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search menu..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, fontSize: '13px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              <button onClick={() => setActiveCat('all')} style={{ padding: '5px 12px', borderRadius: '7px', border: `1px solid ${activeCat === 'all' ? C.br : C.b}`, background: activeCat === 'all' ? C.br : 'transparent', color: activeCat === 'all' ? 'white' : C.m, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', fontWeight: '600' }}>All</button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  style={{ padding: '5px 12px', borderRadius: '7px', border: `1px solid ${activeCat === c.id ? C.br : C.b}`, background: activeCat === c.id ? C.br : 'transparent', color: activeCat === c.id ? 'white' : C.m, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {c.station === 'BAR' ? '🍺' : '🍳'} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            <div className="menu-grid">
              {filtered.map(item => {
                const inCart = cart.find(c => c.menuItemId === item.id)
                const cat = categories.find(c => c.id === item.categoryId)
                return (
                  <div key={item.id} onClick={() => addToCart(item)}
                    style={{ padding: '12px 10px', borderRadius: '10px', background: inCart ? '#1a0f00' : C.s, border: `1px solid ${inCart ? C.br : C.b}`, cursor: 'pointer', position: 'relative', transition: 'all 0.12s' }}>
                    {inCart && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', background: C.br, color: 'white', borderRadius: '999px', width: '20px', height: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                        {inCart.quantity}
                      </div>
                    )}
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{cat?.station === 'BAR' ? '🍺' : '🍽️'}</div>
                    <p style={{ color: C.t, fontWeight: '600', fontSize: '13px', margin: '0 0 4px', lineHeight: '1.3', paddingRight: inCart ? '22px' : '0' }}>{item.name}</p>
                    <p style={{ color: C.br, fontWeight: '700', fontSize: '12px', margin: 0 }}>{fmt(item.price)}</p>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#52525b' }}>
                  <p style={{ fontSize: '32px', marginBottom: '8px' }}>🍽️</p>
                  <p>No items found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Cart (desktop) */}
        <div style={{ width: '300px', borderLeft: `1px solid ${C.b}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
            <p style={{ color: C.t, fontWeight: '700', fontSize: '15px', margin: 0 }}>
              Order {customer ? `· ${customer.name}` : ''} {tableId ? `· ${allTables.find(t => t.id === tableId)?.name ?? ''}` : ''}
            </p>
            {customer && <p style={{ color: '#22c55e', fontSize: '11px', margin: '3px 0 0' }}>⭐ {customer.loyaltyPoints} loyalty points</p>}
          </div>

          {cart.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '32px' }}>🛒</p>
              <p style={{ fontSize: '13px' }}>Tap items to add</p>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {cart.map(item => (
                  <div key={item.menuItemId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '9px', marginBottom: '4px', background: C.s, border: `1px solid ${C.b}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: C.t, fontSize: '13px', fontWeight: '600', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <p style={{ color: C.br, fontSize: '11px', margin: 0 }}>{fmt(item.price)} each</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => updateQty(item.menuItemId, -1)} style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#27272a', border: 'none', color: C.t, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ color: C.t, fontSize: '14px', fontWeight: '700', minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQty(item.menuItemId, 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    <span style={{ color: C.m, fontSize: '12px', minWidth: '56px', textAlign: 'right' }}>{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Order notes (optional)..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, fontSize: '12px', outline: 'none', marginTop: '6px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.b}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}><span style={{ color: C.m }}>Subtotal</span><span style={{ color: C.t }}>{fmt(subtotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}><span style={{ color: C.m }}>Tax (18%)</span><span style={{ color: C.t }}>{fmt(tax)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '16px', fontWeight: '800' }}><span style={{ color: C.t }}>Total</span><span style={{ color: C.br }}>{fmt(total)}</span></div>
                <button onClick={placeOrder} disabled={placing || cart.length === 0}
                  style={{ width: '100%', padding: '13px', borderRadius: '12px', background: cart.length === 0 ? '#27272a' : C.br, border: 'none', color: 'white', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '14px', opacity: placing ? 0.7 : 1 }}>
                  {placing ? 'Placing...' : '🧾 Place Order & Send to Kitchen'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer modal */}
      {showCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowCustomerModal(false)}>
          <div style={{ background: C.s, borderTop: `1px solid ${C.b}`, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '80vh', padding: '20px', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: C.t, fontWeight: '700', margin: 0 }}>👤 Link Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', color: C.m, cursor: 'pointer', fontSize: '22px' }}>×</button>
            </div>

            <input value={customerSearch} onChange={e => searchCustomer(e.target.value)} placeholder="Search by name or phone..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }} />

            {searchingCustomer && <p style={{ color: C.m, fontSize: '13px', marginBottom: '8px' }}>Searching...</p>}

            {customerResults.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {customerResults.map(c => (
                  <div key={c.id} onClick={() => { setCustomer(c); setShowCustomerModal(false); setCustomerSearch(''); setCustomerResults([]) }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '10px', background: C.bg, border: `1px solid ${C.b}`, cursor: 'pointer', marginBottom: '6px' }}>
                    <div>
                      <p style={{ color: C.t, fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{c.name}</p>
                      <p style={{ color: C.m, fontSize: '12px', margin: 0 }}>{c.phone ?? 'No phone'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: '#f59e0b', fontSize: '12px', margin: 0 }}>⭐ {c.loyaltyPoints} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: '14px' }}>
              <p style={{ color: C.m, fontSize: '13px', marginBottom: '10px' }}>Or add new customer:</p>
              <input value={newCustomer.name} onChange={e => setNewCustomer(n => ({ ...n, name: e.target.value }))} placeholder="Customer name *"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }} />
              <input value={newCustomer.phone} onChange={e => setNewCustomer(n => ({ ...n, phone: e.target.value }))} placeholder="Phone number"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }} />
              <button onClick={addCustomer} disabled={!newCustomer.name}
                style={{ width: '100%', padding: '11px', borderRadius: '10px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '14px', opacity: !newCustomer.name ? 0.5 : 1 }}>
                Add & Link Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
