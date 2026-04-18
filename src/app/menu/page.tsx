'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Category { id: string; name: string }
interface MenuItem { id: string; name: string; categoryId: string; price: number; costPrice: number; isActive: boolean; description: string }

const initCats: Category[] = [
  { id: 'cat-food', name: 'Food' },
  { id: 'cat-drinks', name: 'Drinks' },
  { id: 'cat-specials', name: 'Specials' },
]
const initItems: MenuItem[] = [
  { id: '1', name: 'Rolex',           categoryId: 'cat-food',     price: 5000,  costPrice: 2000,  isActive: true,  description: 'Popular street food wrap' },
  { id: '2', name: 'Chips',           categoryId: 'cat-food',     price: 8000,  costPrice: 3000,  isActive: true,  description: '' },
  { id: '3', name: 'Grilled Chicken', categoryId: 'cat-food',     price: 25000, costPrice: 10000, isActive: true,  description: 'Served with sauce' },
  { id: '4', name: 'Beef Stew',       categoryId: 'cat-food',     price: 18000, costPrice: 7000,  isActive: true,  description: '' },
  { id: '5', name: 'Fish & Chips',    categoryId: 'cat-food',     price: 22000, costPrice: 9000,  isActive: true,  description: '' },
  { id: '6', name: 'Matoke',          categoryId: 'cat-food',     price: 10000, costPrice: 3500,  isActive: true,  description: '' },
  { id: '7', name: 'Soda',            categoryId: 'cat-drinks',   price: 3000,  costPrice: 1500,  isActive: true,  description: '' },
  { id: '8', name: 'Water',           categoryId: 'cat-drinks',   price: 1500,  costPrice: 500,   isActive: true,  description: '' },
  { id: '9', name: 'Fresh Juice',     categoryId: 'cat-drinks',   price: 6000,  costPrice: 2500,  isActive: true,  description: '' },
  { id: '10',name: 'Beer',            categoryId: 'cat-drinks',   price: 7000,  costPrice: 4000,  isActive: true,  description: '' },
  { id: '11',name: 'Special Burger',  categoryId: 'cat-specials', price: 35000, costPrice: 14000, isActive: true,  description: 'Double patty, chef special' },
  { id: '12',name: "Chef's Pasta",    categoryId: 'cat-specials', price: 28000, costPrice: 10000, isActive: false, description: 'Seasonal availability' },
]

const blank = (): Omit<MenuItem,'id'> => ({ name:'', categoryId:'cat-food', price:0, costPrice:0, isActive:true, description:'' })

export default function MenuPage() {
  const router = useRouter()
  const [cats, setCats] = useState(initCats)
  const [items, setItems] = useState(initItems)
  const [tab, setTab] = useState<'items'|'categories'>('items')
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null|'add'|'edit'>(null)
  const [editing, setEditing] = useState<MenuItem|null>(null)
  const [form, setForm] = useState(blank())
  const [catInput, setCatInput] = useState('')
  const [catModal, setCatModal] = useState(false)

  const fmt = (n: number) => 'UGX ' + n.toLocaleString()
  const margin = (p: number, c: number) => p > 0 ? Math.round(((p-c)/p)*100) : 0

  const filtered = items.filter(i =>
    (cat === 'all' || i.categoryId === cat) &&
    i.name.toLowerCase().includes(q.toLowerCase())
  )

  const save = () => {
    if (!form.name || form.price <= 0) return
    if (editing) setItems(x => x.map(i => i.id === editing.id ? { ...i, ...form } : i))
    else setItems(x => [...x, { ...form, id: Date.now().toString() }])
    setModal(null)
  }

  const del = (id: string) => { setItems(x => x.filter(i => i.id !== id)); setModal(null) }
  const toggle = (id: string) => setItems(x => x.map(i => i.id === id ? { ...i, isActive: !i.isActive } : i))

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  const Input = ({ label, k, type='text', ph='' }: { label: string; k: keyof typeof form; type?: string; ph?: string }) => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>{label}</label>
      <input type={type} placeholder={ph} value={(form as any)[k] || ''}
        onChange={e => setForm(f => ({ ...f, [k]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }} />
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.m, cursor: 'pointer', fontSize: '20px' }}>←</button>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: C.t, flex: 1 }}>📋 Menu Management</h1>
        <button onClick={() => tab === 'items' ? (setForm(blank()), setEditing(null), setModal('add')) : setCatModal(true)}
          style={{ padding: '8px 16px', borderRadius: '8px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          + Add {tab === 'items' ? 'Item' : 'Category'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
        {(['items','categories'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '11px 24px', background: 'none', border: 'none', borderBottom: `2px solid ${tab===t ? C.br : 'transparent'}`, color: tab===t ? C.br : C.m, cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
            {t === 'items' ? `Items (${items.length})` : `Categories (${cats.length})`}
          </button>
        ))}
      </div>

      {tab === 'items' && <>
        {/* Filters */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.b}`, display: 'flex', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search items..."
            style={{ padding: '7px 12px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, fontSize: '13px', outline: 'none', width: '180px' }} />
          {[{ id: 'all', name: 'All' }, ...cats].map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              style={{ padding: '6px 12px', borderRadius: '7px', border: `1px solid ${cat===c.id ? C.br : C.b}`, background: cat===c.id ? '#1a0f00' : 'transparent', color: cat===c.id ? C.br : C.m, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.b}` }}>
                {['Item','Category','Sell Price','Cost','Margin','Status',''].map(h => (
                  <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: C.m, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const c = cats.find(x => x.id === item.categoryId)
                const m = margin(item.price, item.costPrice)
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.b}`, opacity: item.isActive ? 1 : 0.5 }}>
                    <td style={{ padding: '12px 8px' }}>
                      <p style={{ color: C.t, fontWeight: '600', fontSize: '14px' }}>{item.name}</p>
                      {item.description && <p style={{ color: C.m, fontSize: '11px', marginTop: '2px' }}>{item.description}</p>}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: '#27272a', color: '#a1a1aa' }}>{c?.name}</span>
                    </td>
                    <td style={{ padding: '12px 8px', color: C.br, fontWeight: '700', fontSize: '14px' }}>{fmt(item.price)}</td>
                    <td style={{ padding: '12px 8px', color: C.m, fontSize: '13px' }}>{fmt(item.costPrice)}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: m >= 50 ? '#22c55e' : m >= 30 ? '#f59e0b' : '#ef4444' }}>{m}%</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button onClick={() => toggle(item.id)} style={{ padding: '3px 10px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', background: item.isActive ? '#14532d' : '#3f3f46', color: item.isActive ? '#22c55e' : '#71717a' }}>
                        {item.isActive ? 'Active' : 'Off'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button onClick={() => { setForm({ name: item.name, categoryId: item.categoryId, price: item.price, costPrice: item.costPrice, isActive: item.isActive, description: item.description }); setEditing(item); setModal('edit') }}
                        style={{ background: 'none', border: `1px solid ${C.b}`, color: C.m, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>}

      {tab === 'categories' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {cats.map(c => (
              <div key={c.id} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '18px' }}>
                <p style={{ fontSize: '16px', fontWeight: '700', color: C.t, marginBottom: '6px' }}>{c.name}</p>
                <p style={{ fontSize: '13px', color: C.m }}>{items.filter(i => i.categoryId === c.id).length} items</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModal(null)}>
          <div style={{ background: '#1c1c1e', border: `1px solid ${C.b}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '20px', fontSize: '17px' }}>{modal === 'add' ? '+ Add Menu Item' : 'Edit Item'}</h2>
            <Input label="Item Name *" k="name" ph="e.g. Grilled Tilapia" />
            <Input label="Description" k="description" ph="Optional short description" />
            <Input label="Selling Price (UGX) *" k="price" type="number" ph="0" />
            <Input label="Cost Price (UGX)" k="costPrice" type="number" ph="0" />
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Category</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {form.price > 0 && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#27272a', marginBottom: '16px', fontSize: '13px' }}>
                <span style={{ color: C.m }}>Margin: </span>
                <span style={{ color: '#22c55e', fontWeight: '700' }}>{margin(form.price, form.costPrice)}%</span>
                <span style={{ color: C.m }}> · Profit: </span>
                <span style={{ color: '#22c55e', fontWeight: '700' }}>UGX {(form.price - form.costPrice).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              {editing && <button onClick={() => del(editing.id)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #7f1d1d', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Delete</button>}
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.b}`, background: 'transparent', color: C.m, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: C.br, color: 'white', cursor: 'pointer', fontWeight: '700' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Category modal */}
      {catModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setCatModal(false)}>
          <div style={{ background: '#1c1c1e', border: `1px solid ${C.b}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '340px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '16px' }}>New Category</h2>
            <input value={catInput} onChange={e => setCatInput(e.target.value)} placeholder="e.g. Desserts"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setCatModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.b}`, background: 'transparent', color: C.m, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { if (catInput.trim()) { setCats(c => [...c, { id: 'cat-' + Date.now(), name: catInput.trim() }]); setCatInput(''); setCatModal(false) } }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: C.br, color: 'white', cursor: 'pointer', fontWeight: '700' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
