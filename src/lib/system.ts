import { prisma } from './prisma'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
export type LogCategory = 'AUTH' | 'ORDER' | 'PAYMENT' | 'SYSTEM' | 'API' | 'CHAT' | 'INVENTORY'

interface LogParams {
  level: LogLevel
  category: LogCategory
  message: string
  outletId?: string
  userId?: string
  metadata?: Record<string, any>
}

export async function logEvent(params: LogParams) {
  try {
    await prisma.systemLog.create({
      data: {
        level: params.level,
        category: params.category,
        message: params.message,
        outletId: params.outletId || null,
        userId: params.userId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch (e) {
    // Don't crash the app if logging fails
    console.error('Failed to log event:', e)
  }
}

// Module definitions - what can be enabled per restaurant
export const ALL_MODULES = {
  pos:          { label: 'POS / Take Orders',     icon: '🧾', desc: 'Order taking interface' },
  kitchen:      { label: 'Kitchen Display',       icon: '👨‍🍳', desc: 'Chef order screen' },
  bar:          { label: 'Bar Display',           icon: '🍺', desc: 'Drinks counter screen' },
  billing:      { label: 'Billing & Payments',    icon: '💰', desc: 'Process payments' },
  tables:       { label: 'Table Management',      icon: '🪑', desc: 'Floor plan and tables' },
  menu:         { label: 'Menu Management',       icon: '📋', desc: 'Add/edit menu items' },
  inventory:    { label: 'Inventory & Stock',     icon: '📦', desc: 'Stock tracking' },
  customers:    { label: 'Customer Database',     icon: '👥', desc: 'CRM with loyalty' },
  reservations: { label: 'Reservations',          icon: '📅', desc: 'Table bookings' },
  employees:    { label: 'Employee Management',   icon: '👤', desc: 'Staff & payroll' },
  reports:      { label: 'Reports & Analytics',   icon: '📊', desc: 'Sales reports' },
  performance:  { label: 'Staff Performance',     icon: '🏆', desc: 'Leaderboards' },
  chat:         { label: 'Staff Chat',            icon: '💬', desc: 'Internal messaging' },
  loyalty:      { label: 'Loyalty Program',       icon: '⭐', desc: 'Customer rewards' },
  delivery:     { label: 'Delivery Management',   icon: '🛵', desc: 'Order delivery tracking' },
  ura:          { label: 'URA EFRIS Integration', icon: '🏛️', desc: 'Tax compliance' },
}

export type ModuleKey = keyof typeof ALL_MODULES

// Default module sets per plan
export const PLAN_MODULES: Record<string, ModuleKey[]> = {
  BASIC: ['pos', 'kitchen', 'billing', 'tables', 'menu', 'reports'],
  PRO: ['pos', 'kitchen', 'bar', 'billing', 'tables', 'menu', 'inventory', 'customers', 'employees', 'reports', 'performance', 'chat'],
  ENTERPRISE: Object.keys(ALL_MODULES) as ModuleKey[],
}

// Check if a module is enabled for an outlet
export function hasModule(outletModules: string | null | undefined, module: ModuleKey): boolean {
  if (!outletModules) return true // backward compat - if not set, allow all
  try {
    const enabled: ModuleKey[] = JSON.parse(outletModules)
    return enabled.includes(module)
  } catch { return true }
}
