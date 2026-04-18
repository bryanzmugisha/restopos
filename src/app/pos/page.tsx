'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface MenuItem { id: string; name: string; price: number; categoryId: string }
interface Category { id: string; name: string }
interface CartItem { id: string; menuItemId: string; name: string; price: number; quantity: number }

export default function POSPage() {
  const { status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeCat, setActiveCat] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'DINE_IN'|'TAKEAWAY'|'DELIVERY'>('DINE_IN')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [tables, setTables] = useState<{id:string;name:string}[]>([])
  const [tableId, setTableId] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  useEffect(() => {
    Promise.all([
      fetch('/api/menu/categories').then(r => r.json()),
      fetch('/api/menu/items').then(r => r.json()),
      fetch('/api/tables').then(r => r.json()),
    ]).then(([cats, items, floors]) => {
      setCategories(Array.isArray(cats) ? cats : [])
      setMenuItems(Array.isArray(items) ? items : [])
      const allTables = Array.isArray(floors) ? floors.flatMap((f: any) => f.tables ?? []) : []
      setTables(allTables)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const addToCart = (item: MenuItem) => setCart(c => {
    const ex = c.find(i => i.menuItemId === item.id)
    if (ex) return c.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i)
    return [...c, { id: crypto.randomUUID(), menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]
  })

  const updateQty = (id: string, delta: number) =>
    setCart(c => c.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * 0.18)
  const total = subtotal + tax
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)
  const fmt = (n: number) => 'UGX ' + n.toLocaleString()

  const filtered = menuItems.filter(i =>
    (activeCat === 'all' || i.categoryId === activeCat) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const placeOrder = async () => {
    if (cart.length === 0) return
    setPlacing(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType, tableId: tableId || null,
          items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, unitPrice: i.price })),
          subtotal, taxAmount: tax, totalAmount: total,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCart([]); setTableId(''); setShowCart(false)
        showToast(`✅ ${data.orderNumber} placed! KOT sent to kitchen.`)
      } else {
        showToast('❌ ' + (data.detail || data.error))
      }
    } catch (err: any) { showToast('❌ ' + (err?.message || 'Network error')) }
    setPlacing(false)
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading menu...</div>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:'#18181b', border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px', whiteSpace:'nowrap' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'17px', fontWeight:'700', color:C.t, flex:1 }}>POS — New Order</h1>
        <div style={{ display:'flex', gap:'6px' }}>
          {(['DINE_IN','TAKEAWAY','DELIVERY'] as const).map(t => (
            <button key={t} onClick={() => setOrderType(t)} style={{ padding:'5px 10px', borderRadius:'7px', border:'1px solid', borderColor:orderType===t ? C.br : '#3f3f46', background:orderType===t ? '#1a0f00' : 'transparent', color:orderType===t ? C.br : C.m, cursor:'pointer', fontSize:'11px', fontWeight:'600' }}>
              {t.replace('_',' ')}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCart(true)} style={{ position:'relative', padding:'8px 14px', borderRadius:'10px', background:C.br, border:'none', color:'white', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>
          🛒 {itemCount > 0 && <span style={{ position:'absolute', top:'-6px', right:'-6px', background:'#ef4444', color:'white', borderRadius:'999px', width:'18px', height:'18px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' }}>{itemCount}</span>}
          {fmt(total)}
        </button>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..."
              style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none', marginBottom:'10px' }} />
            <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px' }}>
              {[{id:'all',name:'All'}, ...categories].map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ padding:'6px 14px', borderRadius:'8px', border:'1px solid', borderColor:activeCat===cat.id ? C.br : C.b, background:activeCat===cat.id ? C.br : C.s, color:activeCat===cat.id ? 'white' : C.m, cursor:'pointer', fontSize:'13px', whiteSpace:'nowrap' }}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'14px 16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'10px' }}>
              {filtered.map(item => {
                const inCart = cart.find(c => c.menuItemId === item.id)
                return (
                  <div key={item.id} onClick={() => addToCart(item)} style={{ padding:'14px 12px', borderRadius:'12px', background:inCart ? '#1a0f00' : C.s, border:`1px solid ${inCart ? C.br : C.b}`, cursor:'pointer', position:'relative' }}>
                    {inCart && <div style={{ position:'absolute', top:'8px', right:'8px', background:C.br, color:'white', borderRadius:'999px', width:'20px', height:'20px', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' }}>{inCart.quantity}</div>}
                    <p style={{ fontSize:'14px', fontWeight:'600', color:C.t, marginBottom:'6px', lineHeight:'1.3' }}>{item.name}</p>
                    <p style={{ fontSize:'13px', fontWeight:'700', color:C.br }}>{fmt(item.price)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Desktop cart */}
        <div style={{ width:'300px', borderLeft:`1px solid ${C.b}`, display:'flex', flexDirection:'column' }}>
          {orderType === 'DINE_IN' && tables.length > 0 && (
            <div style={{ padding:'12px', borderBottom:`1px solid ${C.b}` }}>
              <label style={{ display:'block', color:C.m, fontSize:'12px', marginBottom:'5px' }}>Table</label>
              <select value={tableId} onChange={e => setTableId(e.target.value)} style={{ width:'100%', padding:'8px 10px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }}>
                <option value="">Select table...</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <CartPanel cart={cart} onUpdateQty={updateQty} subtotal={subtotal} tax={tax} total={total} onPlace={placeOrder} placing={placing} fmt={fmt} />
        </div>
      </div>

      {showCart && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'flex-end' }} onClick={() => setShowCart(false)}>
          <div style={{ background:C.s, borderTop:`1px solid ${C.b}`, borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'12px 20px', display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${C.b}` }}>
              <h3 style={{ fontWeight:'700', color:C.t }}>Order ({itemCount} items)</h3>
              <button onClick={() => setShowCart(false)} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>×</button>
            </div>
            {orderType === 'DINE_IN' && tables.length > 0 && (
              <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.b}` }}>
                <select value={tableId} onChange={e => setTableId(e.target.value)} style={{ width:'100%', padding:'8px 10px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }}>
                  <option value="">Select table...</option>
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ flex:1, overflowY:'auto' }}>
              <CartPanel cart={cart} onUpdateQty={updateQty} subtotal={subtotal} tax={tax} total={total} onPlace={placeOrder} placing={placing} fmt={fmt} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CartPanel({ cart, onUpdateQty, subtotal, tax, total, onPlace, placing, fmt }: any) {
  const C = { b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
        {cart.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#52525b' }}><p style={{ fontSize:'32px' }}>🛒</p><p>No items yet</p></div>
        ) : cart.map((item: any) => (
          <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:`1px solid ${C.b}` }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:'14px', fontWeight:'500', color:C.t }}>{item.name}</p>
              <p style={{ fontSize:'12px', color:C.br }}>{fmt(item.price)}</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <button onClick={() => onUpdateQty(item.id, -1)} style={{ width:'28px', height:'28px', borderRadius:'7px', border:`1px solid ${C.b}`, background:'#27272a', color:C.t, cursor:'pointer', fontSize:'16px' }}>−</button>
              <span style={{ color:C.t, fontWeight:'700', minWidth:'16px', textAlign:'center' }}>{item.quantity}</span>
              <button onClick={() => onUpdateQty(item.id, 1)} style={{ width:'28px', height:'28px', borderRadius:'7px', border:`1px solid ${C.b}`, background:'#27272a', color:C.t, cursor:'pointer', fontSize:'16px' }}>+</button>
            </div>
            <p style={{ fontSize:'13px', fontWeight:'600', color:C.t, minWidth:'70px', textAlign:'right' }}>{fmt(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>
      {cart.length > 0 && (
        <div style={{ padding:'14px', borderTop:`1px solid ${C.b}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}><span style={{ color:C.m, fontSize:'13px' }}>Subtotal</span><span style={{ color:C.t, fontSize:'13px' }}>{fmt(subtotal)}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}><span style={{ color:C.m, fontSize:'13px' }}>Tax (18%)</span><span style={{ color:C.t, fontSize:'13px' }}>{fmt(tax)}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px', paddingTop:'10px', borderTop:`1px solid ${C.b}` }}>
            <span style={{ color:C.t, fontWeight:'700' }}>Total</span>
            <span style={{ color:C.br, fontWeight:'700', fontSize:'16px' }}>{fmt(total)}</span>
          </div>
          <button onClick={onPlace} disabled={placing} style={{ width:'100%', padding:'13px', borderRadius:'10px', background:C.br, border:'none', color:'white', fontSize:'15px', fontWeight:'700', cursor:'pointer', opacity:placing ? 0.7 : 1 }}>
            {placing ? 'Placing...' : '🧾 Place Order & Send to Kitchen'}
          </button>
        </div>
      )}
    </div>
  )
}
