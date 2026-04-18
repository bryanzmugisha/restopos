'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Ingredient { id: string; name: string; unit: string; currentStock: number; reorderLevel: number; costPerUnit: number; supplier: string }

const initStock: Ingredient[] = [
  { id: '1', name: 'Chicken (whole)',   unit: 'kg',  currentStock: 25,  reorderLevel: 10, costPerUnit: 12000, supplier: 'Kampala Meats' },
  { id: '2', name: 'Beef',             unit: 'kg',  currentStock: 8,   reorderLevel: 10, costPerUnit: 18000, supplier: 'Kampala Meats' },
  { id: '3', name: 'Tilapia Fish',     unit: 'kg',  currentStock: 12,  reorderLevel: 8,  costPerUnit: 15000, supplier: 'Lake Victoria Fresh' },
  { id: '4', name: 'Potatoes',         unit: 'kg',  currentStock: 50,  reorderLevel: 20, costPerUnit: 1500,  supplier: 'Fresh Produce Ltd' },
  { id: '5', name: 'Cooking Oil',      unit: 'L',   currentStock: 18,  reorderLevel: 10, costPerUnit: 6000,  supplier: 'Bidco Uganda' },
  { id: '6', name: 'Tomatoes',         unit: 'kg',  currentStock: 6,   reorderLevel: 5,  costPerUnit: 2000,  supplier: 'Fresh Produce Ltd' },
  { id: '7', name: 'Onions',           unit: 'kg',  currentStock: 15,  reorderLevel: 8,  costPerUnit: 1200,  supplier: 'Fresh Produce Ltd' },
  { id: '8', name: 'Flour',            unit: 'kg',  currentStock: 30,  reorderLevel: 15, costPerUnit: 3500,  supplier: 'Grain Corp' },
  { id: '9', name: 'Soda (crates)',    unit: 'crate',currentStock: 4,  reorderLevel: 5,  costPerUnit: 42000, supplier: 'SBC Uganda' },
  { id: '10',name: 'Beer (crates)',    unit: 'crate',currentStock: 8,  reorderLevel: 6,  costPerUnit: 75000, supplier: 'Nile Breweries' },
  { id: '11',name: 'Matoke (bunch)',   unit: 'bunch',currentStock: 20, reorderLevel: 10, costPerUnit: 5000,  supplier: 'Fresh Produce Ltd' },
  { id: '12',name: 'Rice',            unit: 'kg',  currentStock: 2,   reorderLevel: 10, costPerUnit: 3000,  supplier: 'Grain Corp' },
]

type StockStatus = 'ok' | 'low' | 'critical'
const getStatus = (current: number, reorder: number): StockStatus => {
  if (current <= 0) return 'critical'
  if (current <= reorder) return 'low'
  return 'ok'
}
const statusStyle: Record<StockStatus, { color: string; bg: string; label: string }> = {
  ok:       { color: '#22c55e', bg: '#14532d', label: 'OK' },
  low:      { color: '#f59e0b', bg: '#78350f', label: 'Low' },
  critical: { color: '#ef4444', bg: '#7f1d1d', label: 'Critical' },
}

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState(initStock)
  const [filter, setFilter] = useState<'all'|'low'|'ok'>('all')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null|'adjust'|'add'>(null)
  const [selected, setSelected] = useState<Ingredient|null>(null)
  const [adjQty, setAdjQty] = useState('')
  const [adjType, setAdjType] = useState<'add'|'remove'>('add')
  const [adjReason, setAdjReason] = useState('PURCHASE')
  const [newForm, setNewForm] = useState({ name:'', unit:'kg', currentStock:0, reorderLevel:0, costPerUnit:0, supplier:'' })

  const fmt = (n: number) => 'UGX ' + n.toLocaleString()

  const filtered = items.filter(i => {
    const s = getStatus(i.currentStock, i.reorderLevel)
    const matchF = filter === 'all' || (filter === 'low' && (s === 'low' || s === 'critical')) || (filter === 'ok' && s === 'ok')
    return matchF && i.name.toLowerCase().includes(q.toLowerCase())
  })

  const adjust = () => {
    if (!selected || !adjQty) return
    const qty = parseFloat(adjQty)
    setItems(x => x.map(i => i.id === selected.id
      ? { ...i, currentStock: Math.max(0, i.currentStock + (adjType === 'add' ? qty : -qty)) }
      : i
    ))
    setModal(null); setAdjQty(''); setSelected(null)
  }

  const addItem = () => {
    if (!newForm.name) return
    setItems(x => [...x, { ...newForm, id: Date.now().toString() }])
    setNewForm({ name:'', unit:'kg', currentStock:0, reorderLevel:0, costPerUnit:0, supplier:'' })
    setModal(null)
  }

  const lowCount = items.filter(i => getStatus(i.currentStock, i.reorderLevel) !== 'ok').length
  const totalValue = items.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0)

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.m, cursor: 'pointer', fontSize: '20px' }}>←</button>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: C.t, flex: 1 }}>📦 Inventory</h1>
        <button onClick={() => setModal('add')} style={{ padding: '8px 16px', borderRadius: '8px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          + Add Item
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: '12px', padding: '14px 20px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, overflowX: 'auto' }}>
        {[
          { label: 'Total Items', value: items.length.toString(), color: '#3b82f6' },
          { label: 'Low / Critical', value: lowCount.toString(), color: '#ef4444' },
          { label: 'Stock Value', value: fmt(totalValue), color: '#22c55e' },
        ].map(k => (
          <div key={k.label} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '10px', padding: '12px 18px', minWidth: '140px' }}>
            <p style={{ fontSize: '18px', fontWeight: '800', color: k.color }}>{k.value}</p>
            <p style={{ fontSize: '12px', color: C.m, marginTop: '3px' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', padding: '12px 20px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search ingredients..."
          style={{ padding: '7px 12px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, fontSize: '13px', outline: 'none', width: '200px' }} />
        {([['all','All'],['low','⚠️ Low Stock'],['ok','✅ Stocked']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '6px 14px', borderRadius: '7px', border: `1px solid ${filter===v ? C.br : C.b}`, background: filter===v ? '#1a0f00' : 'transparent', color: filter===v ? C.br : C.m, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.b}` }}>
              {['Ingredient','Stock','Reorder At','Unit Cost','Supplier','Status',''].map(h => (
                <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: C.m, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const st = getStatus(item.currentStock, item.reorderLevel)
              const ss = statusStyle[st]
              const pct = Math.min(100, Math.round((item.currentStock / (item.reorderLevel * 3)) * 100))
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${C.b}` }}>
                  <td style={{ padding: '12px 8px' }}>
                    <p style={{ color: C.t, fontWeight: '600', fontSize: '14px' }}>{item.name}</p>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: C.t, fontWeight: '700', fontSize: '15px' }}>{item.currentStock}</span>
                      <span style={{ color: C.m, fontSize: '12px' }}>{item.unit}</span>
                    </div>
                    <div style={{ marginTop: '5px', height: '4px', background: C.b, borderRadius: '2px', width: '80px' }}>
                      <div style={{ height: '100%', borderRadius: '2px', width: `${pct}%`, background: ss.color, transition: 'width 0.3s' }} />
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: C.m, fontSize: '13px' }}>{item.reorderLevel} {item.unit}</td>
                  <td style={{ padding: '12px 8px', color: C.br, fontSize: '13px', fontWeight: '600' }}>{fmt(item.costPerUnit)}</td>
                  <td style={{ padding: '12px 8px', color: C.m, fontSize: '12px' }}>{item.supplier}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '999px', background: ss.bg + '44', color: ss.color }}>{ss.label}</span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <button onClick={() => { setSelected(item); setAdjQty(''); setAdjType('add'); setModal('adjust') }}
                      style={{ background: 'none', border: `1px solid ${C.b}`, color: C.m, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      Adjust
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Adjust modal */}
      {modal === 'adjust' && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModal(null)}>
          <div style={{ background: '#1c1c1e', border: `1px solid ${C.b}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '4px' }}>Adjust Stock</h2>
            <p style={{ color: C.m, fontSize: '13px', marginBottom: '20px' }}>{selected.name} · Current: <strong style={{ color: C.t }}>{selected.currentStock} {selected.unit}</strong></p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['add','remove'] as const).map(t => (
                <button key={t} onClick={() => setAdjType(t)}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', border: `1px solid ${adjType===t ? (t==='add'?'#22c55e':'#ef4444') : C.b}`, background: adjType===t ? (t==='add'?'#14532d':'#7f1d1d') : 'transparent', color: adjType===t ? (t==='add'?'#22c55e':'#ef4444') : C.m, cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                  {t === 'add' ? '+ Add Stock' : '− Remove'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Quantity ({selected.unit})</label>
              <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '16px', outline: 'none', fontWeight: '700' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Reason</label>
              <select value={adjReason} onChange={e => setAdjReason(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '13px', outline: 'none' }}>
                <option value="PURCHASE">Purchase / Delivery</option>
                <option value="WASTAGE">Wastage / Spoilage</option>
                <option value="ADJUSTMENT">Manual Adjustment</option>
                <option value="RETURN">Supplier Return</option>
              </select>
            </div>

            {adjQty && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#27272a', marginBottom: '16px', fontSize: '13px', color: C.m }}>
                New stock will be: <strong style={{ color: C.t }}>{Math.max(0, selected.currentStock + (adjType === 'add' ? parseFloat(adjQty||'0') : -parseFloat(adjQty||'0')))} {selected.unit}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.b}`, background: 'transparent', color: C.m, cursor: 'pointer' }}>Cancel</button>
              <button onClick={adjust} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: C.br, color: 'white', cursor: 'pointer', fontWeight: '700' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Add item modal */}
      {modal === 'add' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModal(null)}>
          <div style={{ background: '#1c1c1e', border: `1px solid ${C.b}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '20px' }}>+ New Ingredient</h2>
            {[
              { label:'Name *', k:'name', type:'text', ph:'e.g. Garlic' },
              { label:'Opening Stock', k:'currentStock', type:'number', ph:'0' },
              { label:'Reorder Level', k:'reorderLevel', type:'number', ph:'0' },
              { label:'Cost Per Unit (UGX)', k:'costPerUnit', type:'number', ph:'0' },
              { label:'Supplier', k:'supplier', type:'text', ph:'Supplier name' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}>{f.label}</label>
                <input type={f.type} placeholder={f.ph} value={(newForm as any)[f.k]}
                  onChange={e => setNewForm(x => ({ ...x, [f.k]: f.type==='number' ? Number(e.target.value) : e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }} />
              </div>
            ))}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}>Unit</label>
              <select value={newForm.unit} onChange={e => setNewForm(x => ({ ...x, unit: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }}>
                {['kg','g','L','ml','pcs','crate','bunch','bag','bottle'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.b}`, background: 'transparent', color: C.m, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addItem} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: C.br, color: 'white', cursor: 'pointer', fontWeight: '700' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
