import { format, formatDistanceToNow } from 'date-fns'

// ── Currency ──
export function formatCurrency(amount: number, currency = 'UGX'): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ── Order number ──
export function generateOrderNumber(outletCode = 'ORD'): string {
  const date = format(new Date(), 'yyyyMMdd')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `${outletCode}-${date}-${rand}`
}

// ── KOT number ──
export function generateKotNumber(): string {
  const time = format(new Date(), 'HHmmss')
  return `KOT-${time}`
}

// ── Bill number ──
export function generateBillNumber(): string {
  const date = format(new Date(), 'yyyyMMdd')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `BILL-${date}-${rand}`
}

// ── Time formatting ──
export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), 'HH:mm')
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

// ── KDS urgency: minutes since order ──
export function getOrderUrgency(createdAt: Date | string): 'normal' | 'warning' | 'urgent' {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000
  if (mins >= 20) return 'urgent'
  if (mins >= 10) return 'warning'
  return 'normal'
}

// ── Tax calculation ──
export function calculateTax(subtotal: number, taxRate: number, inclusive = false): {
  taxAmount: number
  total: number
} {
  if (inclusive) {
    const taxAmount = subtotal - subtotal / (1 + taxRate)
    return { taxAmount, total: subtotal }
  }
  const taxAmount = subtotal * taxRate
  return { taxAmount, total: subtotal + taxAmount }
}

// ── Class name utility ──
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
