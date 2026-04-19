'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface OrderItem { id: string; menuItemId: string; name: string; quantity: number; unitPrice: number; totalPrice: number; status: string; notes?: string }
interface Order {
  id: string; orderNumber: string; orderType: string; status: string
  tableId?: string; table?: { name: string }
  items: OrderItem[]; totalAmount: number; subtotal: number; taxAmount: number
  createdAt: string; updatedAt: string; waiterId: string
  bills: { status: string; totalAmount: number }[]
}
interface MenuItem { id: string; name: string; price: number; categoryId: string }
interface Category { id: string; name: string }

export default function MyOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order|null>(null)
  const [tab, setTab] = useState<'open'|'today'|'shift'>('open')
  const [addModal, setAddModal] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<{menuItemId:string;name:string;price:number;quantity:number}[]>([])
  const [activeCat, setActiveCat] = useState('all')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }
  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/my-orders')
      if (res.ok) { const data = await res.json(); setOrders(Array.isArray(data) ? data : []) }
    } catch { console.error('Failed') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    if (addModal) {
      Promise.all([fetch('/api/menu/categories').then(r=>r.json()), fetch('/api/menu/items').then(r=>r.json())])
        .then(([cats, items]) => { setCategories(Array.isArray(cats)?cats:[]); setMenuItems(Array.isArray(items)?items:[]) })
    }
  }, [addModal])

  const openAdd = (order: Order) => { setSelected(order); setCart([]); setAddModal(true) }

  const addToCart = (item: MenuItem) => setCart(c => {
    const ex = c.find(i => i.menuItemId === item.id)
    if (ex) return c.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity+1 } : i)
    return [...c, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]
  })

  const submitAdd = async () => {
    if (!selected || cart.length === 0) return
    setAdding(true)
    try {
      const subtotalAdd = cart.reduce((s,i) => s + i.price*i.quantity, 0)
      const taxAdd = Math.round(subtotalAdd * 0.18)
      const res = await fetch(`/api/my-orders/${selected.id}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, unitPrice: i.price })),
          subtotalAdd, taxAdd
        }),
      })
      if (res.ok) {
        showToast('✅ Items added to order & sent to kitchen')
        setAddModal(false); setCart([])
        fetchOrders()
      } else showToast('❌ Failed to add items')
    } catch { showToast('❌ Error') }
    setAdding(false)
  }

  // Filter orders by tab
  const today = new Date().toISOString().slice(0,10)
  const filtered = orders.filter(o => {
    if (tab === 'open') return ['OPEN','IN_PROGRESS','READY'].includes(o.status)
    if (tab === 'today') return o.createdAt.slice(0,10) === today
    return o.createdAt.slice(0,10) === today // shift = today for now
  })

  // Shift stats
  const todayOrders = orders.filter(o => o.createdAt.slice(0,10) === today)
  const openOrders = orders.filter(o => ['OPEN','IN_PROGRESS','READY'].includes(o.status))
  const completedToday = todayOrders.filter(o => o.status === 'COMPLETED')
  const totalEarned = completedToday.reduce((s,o) => s + o.totalAmount, 0)
  const pendingAmount = openOrders.reduce((s,o) => s + o.totalAmount, 0)

  const statusColor: Record<string,string> = { OPEN:'#3b82f6', IN_PROGRESS:'#f59e0b', READY:'#22c55e', COMPLETED:'#71717a', CANCELLED:'#ef4444' }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  const filteredMenu = menuItems.filter(i => activeCat === 'all' || i.categoryId === activeCat)

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, color:C.m }}>Loading orders...</div>

  return (
    <div className="page-root">
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>📋 My Orders</h1>
        <button onClick={() => router.push('/pos')} style={{ padding:'8px 14px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>+ New Order</button>
      </div>

      {/* Shift Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        {[
          { label:'Open Orders', value:openOrders.length, color:'#3b82f6', sub:'Need attention' },
          { label:'Done Today', value:completedToday.length, color:'#22c55e', sub:'Completed' },
          { label:'Pending Bills', value:fmt(pendingAmount), color:'#f59e0b', sub:'With cashier' },
          { label:'Total Today', value:fmt(totalEarned), color:C.br, sub:'Revenue served' },
        ].map(k => (
          <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'10px 12px' }}>
            <p style={{ fontSize:'16px', fontWeight:'800', color:k.color, margin:'0 0 2px' }}>{k.value}</p>
            <p style={{ fontSize:'11px', color:C.t, margin:'0 0 1px', fontWeight:'500' }}>{k.label}</p>
            <p style={{ fontSize:'10px', color:C.m, margin:0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        {([['open',`Open (${openOrders.length})`],['today','Today'],['shift','This Shift']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ flex:1, padding:'10px', background:'none', border:'none', borderBottom:`2px solid ${tab===v?C.br:'transparent'}`, color:tab===v?C.br:C.m, cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>{l}</button>
        ))}
      </div>

      {/* Orders list */}
      <div className="scroll-area" style={{ padding: "10px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#52525b' }}>
            <p style={{ fontSize:'36px', marginBottom:'10px' }}>📋</p>
            <p style={{ fontSize:'15px', color:C.m }}>No orders in this view</p>
          </div>
        ) : filtered.map(order => {
          const billed = order.bills.some(b => b.status === 'PAID')
          const canAdd = ['OPEN','IN_PROGRESS'].includes(order.status) && !billed
          return (
            <div key={order.id} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'12px', padding:'14px', marginBottom:'10px' }}>
              {/* Order header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div>
                  <p style={{ color:C.t, fontWeight:'700', fontSize:'15px', margin:'0 0 2px' }}>{order.orderNumber}</p>
                  <p style={{ color:C.m, fontSize:'12px', margin:0 }}>
                    {order.table ? `Table ${order.table.name}` : order.orderType.replace('_',' ')} · {new Date(order.createdAt).toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'999px', background:(statusColor[order.status]+'22'), color:statusColor[order.status] }}>{order.status}</span>
                  <p style={{ color:C.br, fontWeight:'700', fontSize:'15px', margin:'4px 0 0' }}>{fmt(order.totalAmount)}</p>
                </div>
              </div>

              {/* Items */}
              <div style={{ borderTop:`1px solid ${C.b}`, paddingTop:'10px', marginBottom:'10px' }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ color:C.t, fontSize:'13px' }}>{item.name} ×{item.quantity}</span>
                    <span style={{ color:C.m, fontSize:'13px' }}>{fmt(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {/* Bill status */}
              {billed && (
                <div style={{ background:'#14532d33', borderRadius:'6px', padding:'6px 10px', marginBottom:'10px' }}>
                  <p style={{ color:'#22c55e', fontSize:'12px', fontWeight:'600', margin:0 }}>✅ Bill paid — order complete</p>
                </div>
              )}
              {!billed && ['OPEN','IN_PROGRESS','READY'].includes(order.status) && (
                <div style={{ background:'#1a0f00', borderRadius:'6px', padding:'6px 10px', marginBottom:'10px' }}>
                  <p style={{ color:'#f59e0b', fontSize:'12px', margin:0 }}>⏳ Awaiting payment — {fmt(order.totalAmount)}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:'8px' }}>
                {canAdd && (
                  <button onClick={() => openAdd(order)}
                    style={{ flex:1, padding:'8px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>
                    + Add Items
                  </button>
                )}
                <button onClick={() => window.open(`/invoice?orderId=${order.id}`, '_blank')}
                  style={{ flex:1, padding:'8px', borderRadius:'8px', background:'#1e3a5f', border:'1px solid #3b82f6', color:'#60a5fa', cursor:'pointer', fontSize:'13px' }}>
                  📋 Invoice
                </button>
                <button onClick={() => window.open(`/receipt?orderId=${order.id}`, '_blank')}
                  style={{ flex:1, padding:'8px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.m, cursor:'pointer', fontSize:'13px' }}>
                  🧾 Receipt
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Items Modal */}
      {addModal && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:50, display:'flex', alignItems:'flex-end' }}>
          <div style={{ background:C.s, borderTop:`1px solid ${C.b}`, borderRadius:'20px 20px 0 0', width:'100%', height:'85vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:`1px solid ${C.b}` }}>
              <div>
                <h3 style={{ color:C.t, fontWeight:'700', margin:'0 0 2px' }}>Add to {selected.orderNumber}</h3>
                <p style={{ color:C.m, fontSize:'12px', margin:0 }}>{selected.table ? `Table ${selected.table.name}` : selected.orderType.replace('_',' ')}</p>
              </div>
              <button onClick={() => setAddModal(false)} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'22px' }}>×</button>
            </div>

            {/* Category filter */}
            <div style={{ display:'flex', gap:'6px', padding:'10px 16px', borderBottom:`1px solid ${C.b}`, overflowX:'auto', flexShrink:0 }}>
              {[{id:'all',name:'All'}, ...categories].map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  style={{ padding:'5px 12px', borderRadius:'7px', border:'1px solid', borderColor:activeCat===c.id?C.br:C.b, background:activeCat===c.id?C.br:'transparent', color:activeCat===c.id?'white':C.m, cursor:'pointer', fontSize:'12px', whiteSpace:'nowrap' }}>
                  {c.name}
                </button>
              ))}
            </div>

            {/* Menu grid */}
            <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'8px' }}>
                {filteredMenu.map(item => {
                  const inCart = cart.find(c => c.menuItemId === item.id)
                  return (
                    <div key={item.id} onClick={() => addToCart(item)}
                      style={{ padding:'12px 10px', borderRadius:'10px', background:inCart?'#1a0f00':C.bg, border:`1px solid ${inCart?C.br:C.b}`, cursor:'pointer', position:'relative' }}>
                      {inCart && <div style={{ position:'absolute', top:'6px', right:'6px', background:C.br, color:'white', borderRadius:'999px', width:'18px', height:'18px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' }}>{inCart.quantity}</div>}
                      <p style={{ color:C.t, fontWeight:'600', fontSize:'13px', margin:'0 0 4px', lineHeight:'1.3' }}>{item.name}</p>
                      <p style={{ color:C.br, fontWeight:'700', fontSize:'12px', margin:0 }}>{fmt(item.price)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cart summary + submit */}
            {cart.length > 0 && (
              <div style={{ padding:'14px 16px', borderTop:`1px solid ${C.b}`, background:C.bg }}>
                <div style={{ marginBottom:'10px' }}>
                  {cart.map(i => (
                    <div key={i.menuItemId} style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ color:C.t, fontSize:'13px' }}>+{i.name} ×{i.quantity}</span>
                      <span style={{ color:C.m, fontSize:'13px' }}>{fmt(i.price*i.quantity)}</span>
                    </div>
                  ))}
                </div>
                <button onClick={submitAdd} disabled={adding}
                  style={{ width:'100%', padding:'12px', borderRadius:'10px', background:C.br, border:'none', color:'white', fontWeight:'700', cursor:'pointer', fontSize:'14px', opacity:adding?0.7:1 }}>
                  {adding ? 'Adding...' : `✅ Add ${cart.reduce((s,i)=>s+i.quantity,0)} items to order & send to kitchen`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
