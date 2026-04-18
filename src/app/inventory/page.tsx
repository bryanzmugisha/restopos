'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Ingredient { id: string; name: string; unit: string; currentStock: number; reorderLevel: number; costPerUnit: number }

type StockStatus = 'ok'|'low'|'critical'
const getStatus = (cur: number, reorder: number): StockStatus => cur <= 0 ? 'critical' : cur <= reorder ? 'low' : 'ok'
const statusStyle: Record<StockStatus,{color:string;bg:string;label:string}> = {
  ok:       { color:'#22c55e', bg:'#14532d', label:'OK' },
  low:      { color:'#f59e0b', bg:'#78350f', label:'Low' },
  critical: { color:'#ef4444', bg:'#7f1d1d', label:'Critical' },
}

export default function InventoryPage() {
  const { status } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'low'|'ok'>('all')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null|'adjust'|'add'>(null)
  const [selected, setSelected] = useState<Ingredient|null>(null)
  const [adjQty, setAdjQty] = useState('')
  const [adjType, setAdjType] = useState<'add'|'remove'>('add')
  const [adjReason, setAdjReason] = useState('PURCHASE')
  const [newForm, setNewForm] = useState({ name:'', unit:'kg', currentStock:0, reorderLevel:0, costPerUnit:0 })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory')
      if (res.ok) { const data = await res.json(); setItems(Array.isArray(data) ? data : []) }
    } catch { console.error('Failed to fetch inventory') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const fmt = (n: number) => 'UGX ' + n.toLocaleString()

  const filtered = items.filter(i => {
    const s = getStatus(i.currentStock, i.reorderLevel)
    const matchF = filter === 'all' || (filter === 'low' && s !== 'ok') || (filter === 'ok' && s === 'ok')
    return matchF && i.name.toLowerCase().includes(q.toLowerCase())
  })

  const adjust = async () => {
    if (!selected || !adjQty) return
    setSaving(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, type: adjType, quantity: parseFloat(adjQty), reason: adjReason }),
      })
      if (res.ok) {
        const updated = await res.json()
        setItems(x => x.map(i => i.id === updated.id ? updated : i))
        setModal(null); setAdjQty('')
        showToast('✅ Stock updated')
      } else showToast('❌ Failed to update')
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const addItem = async () => {
    if (!newForm.name) return
    setSaving(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      })
      if (res.ok) {
        const item = await res.json()
        setItems(x => [...x, item])
        setNewForm({ name:'', unit:'kg', currentStock:0, reorderLevel:0, costPerUnit:0 })
        setModal(null)
        showToast('✅ Item added')
      }
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const lowCount = items.filter(i => getStatus(i.currentStock, i.reorderLevel) !== 'ok').length
  const totalValue = items.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0)

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading inventory...</div>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>📦 Inventory</h1>
        <button onClick={() => setModal('add')} style={{ padding:'8px 16px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>+ Add Item</button>
      </div>

      <div style={{ display:'flex', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
        {[{label:'Total Items',value:items.length,color:'#3b82f6'},{label:'Low / Critical',value:lowCount,color:'#ef4444'},{label:'Stock Value',value:fmt(totalValue),color:'#22c55e'}].map(k => (
          <div key={k.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 18px', minWidth:'140px' }}>
            <p style={{ fontSize:'18px', fontWeight:'800', color:k.color }}>{k.value}</p>
            <p style={{ fontSize:'12px', color:C.m, marginTop:'3px' }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:'10px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search ingredients..." style={{ padding:'7px 12px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none', width:'200px' }} />
        {([['all','All'],['low','⚠️ Low Stock'],['ok','✅ Stocked']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding:'6px 14px', borderRadius:'7px', border:'1px solid', borderColor:filter===v ? C.br : C.b, background:filter===v ? '#1a0f00' : 'transparent', color:filter===v ? C.br : C.m, cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>{l}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'0 20px' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.b}` }}>
              {['Ingredient','Stock','Reorder At','Cost/Unit','Status',''].map(h => (
                <th key={h} style={{ padding:'10px 8px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:C.m, textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const st = getStatus(item.currentStock, item.reorderLevel)
              const ss = statusStyle[st]
              const pct = Math.min(100, item.reorderLevel > 0 ? Math.round((item.currentStock / (item.reorderLevel * 3)) * 100) : 100)
              return (
                <tr key={item.id} style={{ borderBottom:`1px solid ${C.b}` }}>
                  <td style={{ padding:'12px 8px' }}><p style={{ color:C.t, fontWeight:'600', fontSize:'14px' }}>{item.name}</p></td>
                  <td style={{ padding:'12px 8px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ color:C.t, fontWeight:'700', fontSize:'15px' }}>{item.currentStock}</span>
                      <span style={{ color:C.m, fontSize:'12px' }}>{item.unit}</span>
                    </div>
                    <div style={{ marginTop:'5px', height:'4px', background:C.b, borderRadius:'2px', width:'80px' }}>
                      <div style={{ height:'100%', borderRadius:'2px', width:`${pct}%`, background:ss.color }} />
                    </div>
                  </td>
                  <td style={{ padding:'12px 8px', color:C.m, fontSize:'13px' }}>{item.reorderLevel} {item.unit}</td>
                  <td style={{ padding:'12px 8px', color:C.br, fontSize:'13px', fontWeight:'600' }}>{fmt(item.costPerUnit)}</td>
                  <td style={{ padding:'12px 8px' }}><span style={{ fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'999px', background:ss.bg+'44', color:ss.color }}>{ss.label}</span></td>
                  <td style={{ padding:'12px 8px' }}>
                    <button onClick={() => { setSelected(item); setAdjQty(''); setAdjType('add'); setModal('adjust') }} style={{ background:'none', border:`1px solid ${C.b}`, color:C.m, padding:'4px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>Adjust</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign:'center', padding:'40px', color:'#52525b' }}>No items found</div>}
      </div>

      {/* Adjust modal */}
      {modal === 'adjust' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'380px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'4px' }}>Adjust Stock</h2>
            <p style={{ color:C.m, fontSize:'13px', marginBottom:'20px' }}>{selected.name} · Current: <strong style={{ color:C.t }}>{selected.currentStock} {selected.unit}</strong></p>
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
              {(['add','remove'] as const).map(t => (
                <button key={t} onClick={() => setAdjType(t)} style={{ flex:1, padding:'9px', borderRadius:'8px', border:`1px solid ${adjType===t ? (t==='add'?'#22c55e':'#ef4444') : C.b}`, background:adjType===t ? (t==='add'?'#14532d':'#7f1d1d') : 'transparent', color:adjType===t ? (t==='add'?'#22c55e':'#ef4444') : C.m, cursor:'pointer', fontWeight:'700' }}>
                  {t === 'add' ? '+ Add' : '− Remove'}
                </button>
              ))}
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Quantity ({selected.unit})</label>
              <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0" style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'16px', outline:'none', fontWeight:'700' }} />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Reason</label>
              <select value={adjReason} onChange={e => setAdjReason(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'13px', outline:'none' }}>
                <option value="PURCHASE">Purchase / Delivery</option>
                <option value="WASTAGE">Wastage / Spoilage</option>
                <option value="ADJUSTMENT_ADD">Manual Adjustment</option>
                <option value="ADJUSTMENT_REMOVE">Manual Removal</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={adjust} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {modal === 'add' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'20px' }}>+ New Ingredient</h2>
            {[{label:'Name *',k:'name',type:'text',ph:'e.g. Garlic'},{label:'Opening Stock',k:'currentStock',type:'number',ph:'0'},{label:'Reorder Level',k:'reorderLevel',type:'number',ph:'0'},{label:'Cost Per Unit (UGX)',k:'costPerUnit',type:'number',ph:'0'}].map(f => (
              <div key={f.k} style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>{f.label}</label>
                <input type={f.type} placeholder={f.ph} value={(newForm as any)[f.k]}
                  onChange={e => setNewForm(x => ({ ...x, [f.k]: f.type==='number' ? Number(e.target.value) : e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
              </div>
            ))}
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'4px' }}>Unit</label>
              <select value={newForm.unit} onChange={e => setNewForm(x => ({ ...x, unit: e.target.value }))} style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }}>
                {['kg','g','L','ml','pcs','crate','bunch','bag','bottle'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={addItem} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
