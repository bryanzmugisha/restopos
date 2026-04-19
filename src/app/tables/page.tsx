'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type TableStatus = 'VACANT'|'OCCUPIED'|'RESERVED'|'UNCLEAN'|'UNSETTLED'
interface Table { id: string; name: string; capacity: number; status: TableStatus; floorId: string }
interface Floor { id: string; name: string; tables: Table[] }

const statusStyle: Record<TableStatus,{border:string;dot:string;label:string;bg:string}> = {
  VACANT:    { border:'#22c55e', dot:'#22c55e', label:'Vacant',    bg:'#09090b' },
  OCCUPIED:  { border:'#f97316', dot:'#f97316', label:'Occupied',  bg:'#1a0f00' },
  RESERVED:  { border:'#3b82f6', dot:'#3b82f6', label:'Reserved',  bg:'#0f172a' },
  UNCLEAN:   { border:'#f59e0b', dot:'#f59e0b', label:'Unclean',   bg:'#1c1200' },
  UNSETTLED: { border:'#ef4444', dot:'#ef4444', label:'Unsettled', bg:'#1a0000' },
}
const statusCycle: TableStatus[] = ['VACANT','OCCUPIED','RESERVED','UNCLEAN','UNSETTLED']

export default function TablesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [floors, setFloors] = useState<Floor[]>([])
  const [activeFloor, setActiveFloor] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'view'|'manage'>('view')
  const [modal, setModal] = useState<null|'addTable'|'editTable'|'addFloor'>(null)
  const [editingTable, setEditingTable] = useState<Table|null>(null)
  const [tableForm, setTableForm] = useState({ name:'', capacity:4 })
  const [floorForm, setFloorForm] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) {
        const data = await res.json()
        const f = Array.isArray(data) ? data : []
        setFloors(f)
        if (f.length > 0 && !activeFloor) setActiveFloor(f[0].id)
      }
    } catch { console.error('Failed to fetch tables') }
    setLoading(false)
  }, [activeFloor])

  useEffect(() => { fetchTables() }, [])

  const cycleStatus = async (table: Table) => {
    const idx = statusCycle.indexOf(table.status)
    const next = statusCycle[(idx + 1) % statusCycle.length]
    setFloors(f => f.map(floor => ({ ...floor, tables: floor.tables.map(t => t.id === table.id ? { ...t, status: next } : t) })))
    try {
      await fetch('/api/tables', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: table.id, status: next }) })
    } catch { fetchTables() }
  }

  const saveTable = async () => {
    if (!tableForm.name.trim()) { showToast('❌ Table name required'); return }
    setSaving(true)
    try {
      const floorId = activeFloor || floors[0]?.id
      const res = await fetch('/api/tables', {
        method: editingTable ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTable ? { id: editingTable.id, ...tableForm } : { ...tableForm, floorId }),
      })
      if (res.ok) {
        await fetchTables()
        setModal(null)
        showToast(editingTable ? '✅ Table updated' : '✅ Table added')
      } else showToast('❌ Failed to save table')
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const deleteTable = async (id: string) => {
    if (!confirm('Delete this table?')) return
    try {
      const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' })
      if (res.ok) { await fetchTables(); showToast('🗑️ Table deleted') }
      else showToast('❌ Cannot delete — table may have active orders')
    } catch { showToast('❌ Error') }
  }

  const saveFloor = async () => {
    if (!floorForm.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tables/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: floorForm }),
      })
      if (res.ok) { await fetchTables(); setFloorForm(''); setModal(null); showToast('✅ Floor added') }
    } catch { showToast('❌ Error') }
    setSaving(false)
  }

  const currentFloor = floors.find(f => f.id === activeFloor)
  const isAdmin = ['ADMIN','MANAGER'].includes(session?.user.role ?? '')
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading tables...</div>

  return (
    <div className="page-root">
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:C.s, border:`1px solid ${C.b}`, borderRadius:'10px', padding:'12px 24px', color:C.t, fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>🪑 Tables</h1>
        {isAdmin && (
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => { setTableForm({ name:'', capacity:4 }); setEditingTable(null); setModal('addTable') }}
              style={{ padding:'8px 14px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>+ Add Table</button>
            <button onClick={() => setModal('addFloor')}
              style={{ padding:'8px 14px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.m, cursor:'pointer', fontSize:'13px' }}>+ Floor</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:'12px', padding:'10px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
        {[
          { label:'Vacant', count:currentFloor?.tables.filter(t=>t.status==='VACANT').length??0, color:'#22c55e' },
          { label:'Occupied', count:currentFloor?.tables.filter(t=>t.status==='OCCUPIED').length??0, color:'#f97316' },
          { label:'Reserved', count:currentFloor?.tables.filter(t=>t.status==='RESERVED').length??0, color:'#3b82f6' },
          { label:'Total', count:currentFloor?.tables.length??0, color:C.m },
        ].map(s => (
          <div key={s.label} style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'8px', padding:'8px 14px', minWidth:'80px', textAlign:'center' }}>
            <p style={{ fontSize:'18px', fontWeight:'800', color:s.color }}>{s.count}</p>
            <p style={{ fontSize:'11px', color:C.m }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Floor tabs */}
      {floors.length > 0 && (
        <div style={{ display:'flex', gap:'8px', padding:'10px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0, overflowX:'auto' }}>
          {floors.map(f => (
            <button key={f.id} onClick={() => setActiveFloor(f.id)}
              style={{ padding:'6px 16px', borderRadius:'8px', border:'1px solid', borderColor:activeFloor===f.id?C.br:C.b, background:activeFloor===f.id?'#1a0f00':'transparent', color:activeFloor===f.id?C.br:C.m, cursor:'pointer', fontSize:'13px', fontWeight:'500', whiteSpace:'nowrap' }}>
              {f.name} <span style={{ color:'#52525b', fontSize:'11px' }}>({f.tables.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Tables grid */}
      <div className="scroll-area" style={{ padding: "16px" }}>
        {!currentFloor || currentFloor.tables.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#52525b' }}>
            <p style={{ fontSize:'48px', marginBottom:'12px' }}>🪑</p>
            <p style={{ fontSize:'16px', color:C.m }}>No tables yet</p>
            {isAdmin && <button onClick={() => { setTableForm({ name:'', capacity:4 }); setEditingTable(null); setModal('addTable') }}
              style={{ marginTop:'16px', padding:'10px 24px', borderRadius:'10px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'600' }}>Add First Table</button>}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'14px', maxWidth:'960px' }}>
            {currentFloor.tables.map(table => {
              const s = statusStyle[table.status]
              return (
                <div key={table.id} style={{ borderRadius:'14px', border:`2px solid ${s.border}`, background:s.bg, overflow:'hidden' }}>
                  {/* Status area - tap to cycle */}
                  <div onClick={() => cycleStatus(table)} style={{ padding:'16px 14px 10px', cursor:'pointer', position:'relative' }}>
                    <div style={{ position:'absolute', top:'10px', right:'10px', width:'8px', height:'8px', borderRadius:'50%', background:s.dot, boxShadow:`0 0 6px ${s.dot}` }} />
                    <p style={{ fontSize:'22px', fontWeight:'800', color:C.t, marginBottom:'4px' }}>{table.name}</p>
                    <p style={{ fontSize:'12px', color:C.m, marginBottom:'6px' }}>{table.capacity} seats</p>
                    <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'999px', background:s.dot+'22', color:s.dot }}>{s.label}</span>
                  </div>
                  {/* Admin controls */}
                  {isAdmin && (
                    <div style={{ display:'flex', borderTop:`1px solid ${C.b}` }}>
                      <button onClick={() => { setTableForm({ name:table.name, capacity:table.capacity }); setEditingTable(table); setModal('editTable') }}
                        style={{ flex:1, padding:'7px', background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'12px', borderRight:`1px solid ${C.b}` }}>✏️ Edit</button>
                      <button onClick={() => deleteTable(table.id)}
                        style={{ flex:1, padding:'7px', background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'12px' }}>🗑️ Del</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ marginTop:'24px', display:'flex', flexWrap:'wrap', gap:'12px' }}>
          {Object.entries(statusStyle).map(([st, s]) => (
            <div key={st} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:s.dot }} />
              <span style={{ fontSize:'12px', color:C.m }}>{s.label}</span>
            </div>
          ))}
          <span style={{ fontSize:'12px', color:'#52525b' }}>· Tap table to cycle status</span>
        </div>
      </div>

      {/* Add/Edit Table Modal */}
      {(modal === 'addTable' || modal === 'editTable') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'360px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'20px' }}>{modal === 'addTable' ? '+ Add Table' : 'Edit Table'}</h2>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Table Name / Number *</label>
              <input value={tableForm.name} onChange={e => setTableForm(f=>({...f,name:e.target.value}))} placeholder="e.g. T1, A3, VIP1, Bar 2"
                style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>Seating Capacity</label>
              <div style={{ display:'flex', gap:'8px' }}>
                {[2,4,6,8,10,12].map(n => (
                  <button key={n} onClick={() => setTableForm(f=>({...f,capacity:n}))}
                    style={{ flex:1, padding:'8px', borderRadius:'8px', border:'1px solid', borderColor:tableForm.capacity===n?C.br:C.b, background:tableForm.capacity===n?'#1a0f00':'transparent', color:tableForm.capacity===n?C.br:C.m, cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={saveTable} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : modal === 'addTable' ? 'Add Table' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Floor Modal */}
      {modal === 'addFloor' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#1c1c1e', border:`1px solid ${C.b}`, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'340px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color:C.t, fontWeight:'700', marginBottom:'16px' }}>+ New Floor / Area</h2>
            <input value={floorForm} onChange={e => setFloorForm(e.target.value)} placeholder="e.g. Ground Floor, Rooftop, Bar Area"
              style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none', marginBottom:'16px' }} />
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setModal(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1px solid ${C.b}`, background:'transparent', color:C.m, cursor:'pointer' }}>Cancel</button>
              <button onClick={saveFloor} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:C.br, color:'white', cursor:'pointer', fontWeight:'700', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Add Floor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
