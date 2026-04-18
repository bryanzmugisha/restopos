'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type TableStatus = 'VACANT'|'OCCUPIED'|'RESERVED'|'UNCLEAN'|'UNSETTLED'
interface Table { id: string; name: string; capacity: number; status: TableStatus }
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
  const { status } = useSession()
  const router = useRouter()
  const [floors, setFloors] = useState<Floor[]>([])
  const [activeFloor, setActiveFloor] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) {
        const data = await res.json()
        const floors = Array.isArray(data) ? data : []
        setFloors(floors)
        if (floors.length > 0 && !activeFloor) setActiveFloor(floors[0].id)
      }
    } catch { console.error('Failed to fetch tables') }
    setLoading(false)
  }, [activeFloor])

  useEffect(() => { fetchTables() }, [])

  const cycleStatus = async (table: Table) => {
    const idx = statusCycle.indexOf(table.status)
    const next = statusCycle[(idx + 1) % statusCycle.length]
    // Optimistic update
    setFloors(f => f.map(floor => ({ ...floor, tables: floor.tables.map(t => t.id === table.id ? { ...t, status: next } : t) })))
    // Persist to DB
    try {
      await fetch('/api/tables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: table.id, status: next }),
      })
    } catch { fetchTables() } // Revert on error
  }

  const currentFloor = floors.find(f => f.id === activeFloor)
  const counts = {
    vacant:   currentFloor?.tables.filter(t => t.status === 'VACANT').length ?? 0,
    occupied: currentFloor?.tables.filter(t => t.status === 'OCCUPIED').length ?? 0,
    reserved: currentFloor?.tables.filter(t => t.status === 'RESERVED').length ?? 0,
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:C.m, background:C.bg }}>Loading tables...</div>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
          <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t }}>Table Management</h1>
        </div>
        <div style={{ display:'flex', gap:'16px' }}>
          {[{label:'Vacant',v:counts.vacant,c:'#22c55e'},{label:'Occupied',v:counts.occupied,c:'#f97316'},{label:'Reserved',v:counts.reserved,c:'#3b82f6'}].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}><p style={{ fontSize:'20px', fontWeight:'700', color:s.c }}>{s.v}</p><p style={{ fontSize:'11px', color:C.m }}>{s.label}</p></div>
          ))}
        </div>
      </div>

      {floors.length > 1 && (
        <div style={{ display:'flex', gap:'8px', padding:'12px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
          {floors.map(f => (
            <button key={f.id} onClick={() => setActiveFloor(f.id)} style={{ padding:'6px 16px', borderRadius:'8px', border:'1px solid', borderColor:activeFloor===f.id ? C.br : C.b, background:activeFloor===f.id ? '#1a0f00' : 'transparent', color:activeFloor===f.id ? C.br : C.m, cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>{f.name}</button>
          ))}
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
        {currentFloor?.tables.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#52525b' }}>No tables found</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'14px', maxWidth:'900px' }}>
            {currentFloor?.tables.map(table => {
              const s = statusStyle[table.status]
              return (
                <div key={table.id} onClick={() => cycleStatus(table)} style={{ padding:'18px 14px', borderRadius:'14px', border:`2px solid ${s.border}`, background:s.bg, cursor:'pointer', transition:'all 0.15s', position:'relative' }}>
                  <div style={{ position:'absolute', top:'10px', right:'10px', width:'8px', height:'8px', borderRadius:'50%', background:s.dot, boxShadow:`0 0 6px ${s.dot}` }} />
                  <p style={{ fontSize:'22px', fontWeight:'800', color:C.t, marginBottom:'4px' }}>{table.name}</p>
                  <p style={{ fontSize:'12px', color:C.m, marginBottom:'8px' }}>{table.capacity} seats</p>
                  <span style={{ fontSize:'11px', fontWeight:'600', padding:'3px 8px', borderRadius:'999px', background:s.dot+'22', color:s.dot }}>{s.label}</span>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ marginTop:'24px', display:'flex', flexWrap:'wrap', gap:'12px' }}>
          {Object.entries(statusStyle).map(([st, s]) => (
            <div key={st} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:s.dot }} />
              <span style={{ fontSize:'12px', color:C.m }}>{s.label}</span>
            </div>
          ))}
          <span style={{ fontSize:'12px', color:'#52525b' }}>· Tap to cycle status</span>
        </div>
      </div>
    </div>
  )
}
