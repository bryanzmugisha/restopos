'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface ReceiptData {
  billId: string|null; billNumber: string; orderNumber: string
  outletName: string; outletAddress: string; outletPhone: string; currency: string
  tableNo?: string|null; orderType: string; status?: string
  customerName?: string|null; customerPhone?: string|null
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[]
  subtotal: number; taxAmount: number; discountAmount: number; totalAmount: number
  paymentMethod: string; amountPaid: number; changeGiven: number
  payments: { method: string; amount: number }[]
  cashierName: string; paidAt: string
}

function ReceiptContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [receipt, setReceipt] = useState<ReceiptData|null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const billId = searchParams.get('id') || searchParams.get('billId')
    const orderId = searchParams.get('orderId')

    if (!billId && !orderId) { setLoading(false); return }

    // Build API URL: bill by ID, or bill looked up by orderId
    const url = billId
      ? `/api/bills/${billId}`
      : `/api/bills/by-order/${orderId}`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.orderNumber) setReceipt(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [searchParams])

  const fmt = (n: number, currency = 'UGX') => `${currency} ${Math.round(n).toLocaleString()}`

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    if (!receipt) return
    const c = receipt.currency ?? 'UGX'
    const isPaid = receipt.status !== 'UNPAID'
    const lines = [
      `🍽️ *${receipt.outletName}*`,
      receipt.outletAddress || null,
      receipt.outletPhone ? `📞 ${receipt.outletPhone}` : null,
      ``,
      isPaid ? `🧾 *RECEIPT — ${receipt.billNumber}*` : `📋 *PRO-FORMA RECEIPT*`,
      `Order: ${receipt.orderNumber}`,
      receipt.tableNo ? `Table: ${receipt.tableNo}` : null,
      receipt.customerName ? `Customer: ${receipt.customerName}` : null,
      `Date: ${new Date(receipt.paidAt).toLocaleString()}`,
      ``,
      `*ITEMS*`,
      ...receipt.items.map(i => `• ${i.name} ×${i.quantity} = *${fmt(i.totalPrice, c)}*`),
      ``,
      `Subtotal: ${fmt(receipt.subtotal, c)}`,
      receipt.taxAmount > 0 ? `Tax: ${fmt(receipt.taxAmount, c)}` : null,
      receipt.discountAmount > 0 ? `Discount: -${fmt(receipt.discountAmount, c)}` : null,
      `*TOTAL: ${fmt(receipt.totalAmount, c)}*`,
      isPaid ? `\nPayment: ${receipt.paymentMethod.replace(/_/g,' ')}` : `\n_Awaiting payment_`,
      ``,
      `Thank you for visiting *${receipt.outletName}*! 🙏`,
    ].filter(v => v !== null).join('\n')

    const encoded = encodeURIComponent(lines)
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    window.open(isMobile ? `whatsapp://send?text=${encoded}` : `https://web.whatsapp.com/send?text=${encoded}`, '_blank')
  }

  const handleSaveImage = async () => {
    if (!receiptRef.current) return
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#ffffff', scale: 2 })
      const link = document.createElement('a')
      link.download = `receipt-${receipt?.billNumber ?? 'receipt'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { alert('Use Print > Save as PDF instead') }
    setSharing(false)
  }

  const C = { bg: '#09090b', s: '#18181b', b: '#27272a', t: '#fafafa', m: '#71717a', br: '#f97316' }
  const isPaid = receipt?.status !== 'UNPAID'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.m }}>
      Loading receipt...
    </div>
  )

  if (!receipt) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, gap: '12px' }}>
      <p style={{ fontSize: '40px' }}>🧾</p>
      <p style={{ color: C.m, fontSize: '16px' }}>Receipt not found</p>
      <button onClick={() => { if (window.opener || window.history.length <= 1) window.close(); else router.push('/billing') }} style={{ padding: '10px 24px', borderRadius: '8px', background: C.br, border: 'none', color: 'white', cursor: 'pointer' }}>Go Back</button>
    </div>
  )

  const c = receipt.currency ?? 'UGX'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '16px', boxSizing: 'border-box' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          #receipt-card { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
        }
      `}</style>

      {/* Action buttons */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px', flexWrap: 'wrap', maxWidth: '340px', margin: '0 auto 16px' }}>
        <button onClick={() => { if (window.opener || window.history.length <= 1) window.close(); else router.push('/billing') }} style={{ padding: '10px 14px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.m, cursor: 'pointer', fontSize: '13px' }}>← Back</button>
        <button onClick={handlePrint} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: '#1e3a5f', border: '1px solid #3b82f6', color: '#60a5fa', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>🖨️ Print</button>
        <button onClick={handleWhatsApp} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: '#052e16', border: '1px solid #22c55e', color: '#22c55e', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>📱 WhatsApp</button>
        <button onClick={handleSaveImage} disabled={sharing} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: '#1a0f00', border: `1px solid ${C.br}`, color: C.br, cursor: 'pointer', fontWeight: '700', fontSize: '13px', opacity: sharing ? 0.7 : 1 }}>
          {sharing ? '...' : '🖼️ Image'}
        </button>
      </div>

      {/* Receipt card */}
      <div id="receipt-card" ref={receiptRef}
        style={{ background: 'white', color: '#111', maxWidth: '320px', margin: '0 auto', padding: '24px 20px', borderRadius: '8px', fontFamily: '"Courier New", Courier, monospace' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>🍽️</div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 3px', textTransform: 'uppercase' }}>{receipt.outletName}</h2>
          {receipt.outletAddress && <p style={{ fontSize: '11px', color: '#555', margin: '0 0 1px' }}>{receipt.outletAddress}</p>}
          {receipt.outletPhone && <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>Tel: {receipt.outletPhone}</p>}
        </div>

        {!isPaid && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', padding: '6px', marginBottom: '10px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#856404' }}>
            ⚠️ PRO-FORMA — NOT YET PAID
          </div>
        )}

        <div style={{ borderTop: '1px dashed #999', margin: '10px 0' }} />

        {/* Order info */}
        <div style={{ fontSize: '11px', marginBottom: '10px' }}>
          {([
            ['Receipt', receipt.billNumber],
            ['Order', receipt.orderNumber],
            receipt.tableNo ? ['Table', receipt.tableNo] : null,
            receipt.customerName ? ['Customer', receipt.customerName] : null,
            receipt.customerPhone ? ['Phone', receipt.customerPhone] : null,
            ['Date', new Date(receipt.paidAt).toLocaleString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
            ['Cashier', receipt.cashierName],
          ] as (string[]|null)[]).filter((x): x is string[] => Boolean(x)).map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#555' }}>{label}:</span>
              <span style={{ fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px dashed #999', margin: '10px 0' }} />

        {/* Items */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#555', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>Item</span><span>Amount</span>
          </div>
          {receipt.items.map((item, i) => (
            <div key={i} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                <span style={{ maxWidth: '65%' }}>{item.name}</span>
                <span>{fmt(item.totalPrice, c)}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>{item.quantity} × {fmt(item.unitPrice, c)}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px dashed #999', margin: '10px 0' }} />

        {/* Totals */}
        <div style={{ fontSize: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>Subtotal</span><span>{fmt(receipt.subtotal, c)}</span></div>
          {receipt.taxAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>Tax (18%)</span><span>{fmt(receipt.taxAmount, c)}</span></div>}
          {receipt.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: 'green' }}><span>Discount</span><span>-{fmt(receipt.discountAmount, c)}</span></div>}
        </div>

        <div style={{ borderTop: '2px solid #111', padding: '8px 0', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700' }}>
            <span>TOTAL</span><span>{fmt(receipt.totalAmount, c)}</span>
          </div>
        </div>

        {/* Payment */}
        {isPaid ? (
          <div style={{ fontSize: '11px', marginBottom: '10px' }}>
            {receipt.payments.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>{p.method.replace(/_/g, ' ')}</span><span>{fmt(p.amount, c)}</span>
              </div>
            ))}
            {receipt.changeGiven > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                <span>Change</span><span>{fmt(receipt.changeGiven, c)}</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#856404', textAlign: 'center', fontStyle: 'italic', marginBottom: '8px' }}>
            Payment pending
          </div>
        )}

        <div style={{ borderTop: '1px dashed #999', margin: '10px 0' }} />

        {isPaid && (
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <span style={{ background: '#000', color: 'white', padding: '3px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em' }}>✓ PAID</span>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#555', marginTop: '12px' }}>
          <p style={{ margin: '0 0 3px', fontWeight: '700' }}>Thank you for your visit!</p>
          <p style={{ margin: '0 0 8px' }}>Please come again 🙏</p>
          <p style={{ margin: 0, fontSize: '10px', color: '#aaa' }}>Powered by RestoPOS · Brycore</p>
        </div>
      </div>
    </div>
  )
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#71717a' }}>Loading...</div>}>
      <ReceiptContent />
    </Suspense>
  )
}
