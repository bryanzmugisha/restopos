import { create } from 'zustand'

export type TableStatus = 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'UNCLEAN' | 'UNSETTLED'

export interface Table {
  id: string
  name: string
  capacity: number
  status: TableStatus
  floorId: string
  positionX: number
  positionY: number
  shape: 'rectangle' | 'circle'
  width: number
  height: number
  activeOrderId?: string
  waiterId?: string
  waiterName?: string
  guestCount?: number
  openedAt?: string
}

export interface Floor {
  id: string
  name: string
  tables: Table[]
}

interface TableStore {
  floors:       Floor[]
  activeFloor:  string | null
  selectedTable: Table | null
  setFloors:    (floors: Floor[]) => void
  setActiveFloor: (floorId: string) => void
  updateTable:  (tableId: string, updates: Partial<Table>) => void
  selectTable:  (table: Table | null) => void
  getTable:     (tableId: string) => Table | undefined
  vacantCount:  () => number
  occupiedCount: () => number
}

export const useTableStore = create<TableStore>((set, get) => ({
  floors: [],
  activeFloor: null,
  selectedTable: null,

  setFloors: (floors) =>
    set({ floors, activeFloor: floors[0]?.id ?? null }),

  setActiveFloor: (floorId) => set({ activeFloor: floorId }),

  updateTable: (tableId, updates) =>
    set((s) => ({
      floors: s.floors.map((f) => ({
        ...f,
        tables: f.tables.map((t) =>
          t.id === tableId ? { ...t, ...updates } : t
        ),
      })),
    })),

  selectTable: (table) => set({ selectedTable: table }),

  getTable: (tableId) => {
    for (const floor of get().floors) {
      const t = floor.tables.find((t) => t.id === tableId)
      if (t) return t
    }
  },

  vacantCount: () =>
    get().floors.flatMap((f) => f.tables).filter((t) => t.status === 'VACANT').length,

  occupiedCount: () =>
    get().floors.flatMap((f) => f.tables).filter((t) => t.status === 'OCCUPIED').length,
}))
