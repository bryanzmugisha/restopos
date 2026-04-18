'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Category { id: string; name: string }
interface MenuItem { id: string; name: string; categoryId: string; price: number; costPrice: number; isActive: boolean; description: string; category?: { name: string } }

const blank = (): Omit<MenuItem,'id'|'category'> => ({ name:'', categoryId:'', price:0, costPrice:0, isActive:true, description:'' })

export default function MenuPage() {
  const { status } = useSession()
  const router = useRouter()
  const [cats, setCats] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'items'|'categories'>('items')
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null|'add'|'edit'>(null)
  const [editing, setEditing] = useState<MenuItem|null>(null)
  const [form, setForm] = useState(blank())
  const [catModal, setCatModal] = useState(false)
  const [catInput, setCatInput] = useState('')
  const [catStation, setCatStation] = useState('KITCHEN')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, iRes] = await Promise.all([fetch('/api/menu/categories'), fetch('/api/menu/items')])
      if (cRes.ok) setCats(await cRes.json())
      if (iRes.ok) setItems(await iRes.json())
    } catch { console.error('Failed to fetch menu') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const fmt = (n: number) => 'UGX ' + n.toLocaleString()
  const margin = (p: number, c: number) => p > 0 ? Math.round(((p-c)/p)*100) : 0

  const filtered = items.filter(i =>
    (cat === 'all' || i.categoryId === cat) &&
    i.name.toLowerCase().includes(q.toLowerCase())
  )

  const saveItem = async () => {
    if (!form.name || form.price <= 0) { showToast('❌ Name and price required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/menu/items', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...form, id: editing.id } : form),
      })
      if (res.ok) {
        const item = await res.json()
        if (editing) setItems(x => x.map(i => i.id === item.id ? { ...item, category: cats.find(c => c.id === item.categoryId) } : i))
        else setItems(x => [...x, { ...item, category: cats.find(c => c.id === item.categoryId) }])
        setModal(null)
        showToast(editing ? '✅ Item updated' : '✅ Item added')
      } else showToast('❌ ' + (await res.json()).error)
    } catch { showToast('❌ Error saving') }
    setSaving(false)
  }

  const toggleActive = async (item: MenuItem) => {
    try {
      const res = await fetch('/api/menu/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, name: item.name, categoryId: item.categoryId, price: item.price, costPrice: item.costPrice, description: item.description, isActive: !item.isActive }),
      })
      if (res.ok) setItems(x => x.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i))
    } catch { showToast('❌ Error') }
  }

  const saveCat = async () => {
    if (!catInput.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catInput.trim(), station: catStation }),
      })
      if (res.ok) { const c = await res.json(); setCats(x => [...x, c]); setCatInput(''); setCatModal(false); showToast('✅ Category added') }
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const openEdit = (item: MenuItem) => {
    setForm({ name:item.name, categoryId:item.categoryId, price:item.price, costPrice:item.costPrice, isActive:item.isActive, description:item.description })
    setEditing(item); setModal('edit')
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading menu...</div>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>📋 Menu Management</h1>
        <button onClick={() => tab === 'items' ? (setForm({ ...blank(), categoryId: cats[0]?.id ?? '' }), setEditing(null), setModal('add')) : setCatModal(true)}
          style={{ padding:'8px 16px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>
          + Add {tab === 'items' ? 'Item' : 'Category'}
        </button>
      </div>

      <div style={{ display:'flex', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        {(['items','categories'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'11px 24px', background:'none', border:'none', borderBottom:`2px solid ${tab===t ? C.br : 'transparent'}`, color:tab===t ? C.br : C.m, cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
            {t === 'items' ? `Items (${items.length})` : `Categories (${cats.length})`}
          </button>
        ))}
      </div>

      {tab === 'items' && <>
        <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.b}`, display:'flex', gap:'10px', flexWrap:'wrap', flexShrink:0 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search items..." style={{ padding:'7px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none', width:'180px' }} />
          {[{id:'all',name:'All'}, ...cats].map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{ padding:'6px 12px', borderRadius:'7px', border:`1px solid ${cat===c.id ? C.br : C.b}`, background:cat===c.id ? '#1a0f00' : 'transparent', color:cat===c.id ? C.br : C.m, cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>{c.name}</button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'0 20px' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.b}` }}>
                {['Item','Category','Sell Price','Cost','Margin','Status',''].map(h => (
                  <th key={h} style={{ padding:'10px 8px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:C.m, textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const c = cats.find(x => x.id === item.categoryId)
                const m = margin(item.price, item.costPrice)
                return (
                  <tr key={item.id} style={{ borderBottom:`1px solid ${C.b}`, opacity:item.isActive ? 1 : 0.5 }}>
                    <td style={{ padding:'12px 8px' }}>
                      <p style={{ color:C.t, fontWeight:'600', fontSize:'14px' }}>{item.name}</p>
                      {item.description && <p style={{ color:C.m, fontSize:'11px', marginTop:'2px' }}>{item.description}</p>}
                    </td>
                    <td style={{ padding:'12px 8px' }}><span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'999px', background:'#27272a', color:'#a1a1aa' }}>{c?.name ?? '—'}</span></td>
                    <td style={{ padding:'12px 8px', color:C.br, fontWeight:'700' }}>{fmt(item.price)}</td>
                    <td style={{ padding:'12px 8px', color:C.m, fontSize:'13px' }}>{fmt(item.costPrice)}</td>
                    <td style={{ padding:'12px 8px' }}><span style={{ fontSize:'12px', fontWeight:'700', color:m>=50?'#22c55e':m>=30?'#f59e0b':'#ef4444' }}>{m}%</span></td>
                    <td style={{ padding:'12px 8px' }}>
                      <button onClick={() => toggleActive(item)} style={{ padding:'3px 10px', borderRadius:'999px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:'700', background:item.isActive ? '#14532d' : '#3f3f46', color:item.isActive ? '#22c55e' : '#71717a' }}>
                        {item.isActive ? 'Active' : 'Off'}
                      </button>
                    </td>
                    <td style={{ padding:'12px 8px' }}>
                      <button onClick={() => openEdit(item)} style={{ background:'none', border:`1px solid ${C.b}`, color:C.m, padding:'4px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>Edit</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign:'center', padding:'40px', color:'#52525b' }}>No items found</div>}
        </div>
      </>}

      {tab === 'categories' && (
        <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
          <div style={{ background:'#1a0f00', border:'1px solid #78350f', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', fontSize:'13px', color:'#f59e0b' }}>
            💡 Set each category to the correct station so orders are automatically routed — food goes to Kitchen, drinks go to Bar.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'12px' }}>
            {cats.map(c => {
              const station = (c as any).station ?? 'KITCHEN'
              type StationKey = 'KITCHEN'|'BAR'|'ALL'
              const stationConfigs: Record<StationKey, {label:string;color:string;bg:string;border:string}> = {
                KITCHEN: { label:'🍳 Kitchen', color:'#f97316', bg:'#1a0f00', border:'#78350f' },
                BAR:     { label:'🍺 Bar / Counter', color:'#6366f1', bg:'#1e1b4b', border:'#4338ca' },
                ALL:     { label:'📦 All Stations', color:'#22c55e', bg:'#052e16', border:'#16a34a' },
              }
              const stationConfig = stationConfigs[(station as StationKey)] ?? stationConfigs.KITCHEN
              return (
                <div key={c.id} style={{ background:C.s, border:`2px solid ${stationConfig.border}`, borderRadius:'12px', padding:'16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                    <div>
                      <p style={{ fontSize:'16px', fontWeight:'700', color:C.t, margin:'0 0 4px' }}>{c.name}</p>
                      <p style={{ fontSize:'12px', color:C.m, margin:0 }}>{items.filter(i => i.categoryId === c.id).length} items</p>
                    </div>
                    <span style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'6px', background:stationConfig.bg, color:stationConfig.color, fontWeight:'700', border:`1px solid ${stationConfig.border}` }}>{stationConfig.label}</span>
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    {['KITCHEN','BAR','ALL'].map(s => (
                      <button key={s} onClick={async () => {
                        const res = await fetch('/api/menu/categories', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: c.id, name: c.name, station: s }) })
                        if (res.ok) fetchAll()
                      }} style={{ flex:1, padding:'5px', borderRadius:'6px', border:`1px solid ${station===s ? stationConfig.border : C.b}`, background:station===s ? stationConfig.bg : 'transparent', color:station===s ? stationConfig.color : C.m, cursor:'pointer', fontSize:'10px', fontWeight:'700' }}>
                        {s==='KITCHEN'?'🍳':s==='BAR'?'🍺':'📦'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Item modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'20px', fontSize:'17px' }}>{modal === 'add' ? '+ Add Menu Item' : 'Edit Item'}</h2>
            {[{label:'Item Name *',k:'name',type:'text',ph:'e.g. Grilled Tilapia'},{label:'Description',k:'description',type:'text',ph:'Optional'},{label:'Selling Price (UGX) *',k:'price',type:'number',ph:'0'},{label:'Cost Price (UGX)',k:'costPrice',type:'number',ph:'0'}].map(f => (
              <div key={f.k} style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>{f.label}</label>
                <input type={f.type} placeholder={f.ph} value={(form as any)[f.k] || ''}
                  onChange={e => setForm(x => ({ ...x, [f.k]: f.type==='number' ? Number(e.target.value) : e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            ))}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Category</label>
              <select value={form.categoryId} onChange={e => setForm(x => ({ ...x, categoryId: e.target.value }))}
                style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }}>
                <option value="">Select category...</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {form.price > 0 && (
              <div style={{ padding:'10px 14px', borderRadius:'8px', background:'#27272a', marginBottom:'16px', fontSize:'13px' }}>
                <span style={{ color:C.m }}>Margin: </span><span style={{ color:'#22c55e', fontWeight:'700' }}>{margin(form.price, form.costPrice)}%</span>
                <span style={{ color:C.m }}> · Profit: </span><span style={{ color:'#22c55e', fontWeight:'700' }}>UGX {(form.price - form.costPrice).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={saveItem} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category modal */}
      {catModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setCatModal(false)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'340px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'16px' }}>New Category</h2>
            <input value={catInput} onChange={e => setCatInput(e.target.value)} placeholder="e.g. Desserts"
              style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none', marginBottom:'16px' }} />
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setCatModal(false)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={saveCat} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
