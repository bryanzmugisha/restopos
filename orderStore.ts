import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface CartItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
  modifiers: { optionId: string; name: string; additionalPrice: number }[]
}

export interface ActiveOrder {
  id?: string            // undefined = new order not yet saved
  orderNumber?: string
  tableId?: string
  tableName?: string
  customerId?: string
  customerName?: string
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ROOM_SERVICE'
  items: CartItem[]
  notes?: string
}

interface OrderStore {
  // Active order being composed
  activeOrder: ActiveOrder
  // Cart actions
  setOrderType: (type: ActiveOrder['orderType']) => void
  setTable:     (tableId: string, tableName: string) => void
  setCustomer:  (id: string, name: string) => void
  addItem:      (item: Omit<CartItem, 'id'>) => void
  updateQty:    (id: string, qty: number) => void
  removeItem:   (id: string) => void
  addNote:      (id: string, note: string) => void
  clearCart:    () => void
  // Computed
  itemCount: () => number
  subtotal:  () => number
}

const defaultOrder: ActiveOrder = {
  orderType: 'DINE_IN',
  items: [],
}

export const useOrderStore = create<OrderStore>()(
  devtools(
    (set, get) => ({
      activeOrder: { ...defaultOrder },

      setOrderType: (type) =>
        set((s) => ({ activeOrder: { ...s.activeOrder, orderType: type } })),

      setTable: (tableId, tableName) =>
        set((s) => ({ activeOrder: { ...s.activeOrder, tableId, tableName } })),

      setCustomer: (id, name) =>
        set((s) => ({ activeOrder: { ...s.activeOrder, customerId: id, customerName: name } })),

      addItem: (item) => {
        const existing = get().activeOrder.items.find(
          (i) =>
            i.menuItemId === item.menuItemId &&
            JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
        )
        if (existing) {
          set((s) => ({
            activeOrder: {
              ...s.activeOrder,
              items: s.activeOrder.items.map((i) =>
                i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            },
          }))
        } else {
          set((s) => ({
            activeOrder: {
              ...s.activeOrder,
              items: [
                ...s.activeOrder.items,
                { ...item, id: crypto.randomUUID() },
              ],
            },
          }))
        }
      },

      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id)
          return
        }
        set((s) => ({
          activeOrder: {
            ...s.activeOrder,
            items: s.activeOrder.items.map((i) =>
              i.id === id ? { ...i, quantity: qty } : i
            ),
          },
        }))
      },

      removeItem: (id) =>
        set((s) => ({
          activeOrder: {
            ...s.activeOrder,
            items: s.activeOrder.items.filter((i) => i.id !== id),
          },
        })),

      addNote: (id, note) =>
        set((s) => ({
          activeOrder: {
            ...s.activeOrder,
            items: s.activeOrder.items.map((i) =>
              i.id === id ? { ...i, notes: note } : i
            ),
          },
        })),

      clearCart: () => set({ activeOrder: { ...defaultOrder } }),

      itemCount: () =>
        get().activeOrder.items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().activeOrder.items.reduce(
          (sum, i) =>
            sum +
            (i.price + i.modifiers.reduce((m, mod) => m + mod.additionalPrice, 0)) *
              i.quantity,
          0
        ),
    }),
    { name: 'order-store' }
  )
)
