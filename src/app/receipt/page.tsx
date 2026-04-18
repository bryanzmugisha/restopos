'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface ReceiptData {
  billNumber: string; orderNumber: string; outletName: string
  outletAddress: string; outletPhone: string
  tableNo?: string; orderType: string
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[]
  subtotal: number; taxAmount: number; discountAmount: number; totalAmount: number
  paymentMethod: string; amountPaid: number; changeGiven: number
  paidAt: string; cashierName: string
}

function ReceiptContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const billId = searchParams.get('id')
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!billId) { setLoading(false); return }
    fetch(`/api/bills/${billId}`)
      .then(r => r.json())
      .then(data => { setReceipt(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [billId])

  const fmt = (n: number) => 'UGX ' + Math.round(n).toLocaleString()

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    const d = data
    const lines = [
      `🍽️ *${d.outletName}*`,
      `📄 Receipt: ${d.billNumber}`,
      `📅 ${new Date(d.paidAt).toLocaleString()}`,
      ``,
      `*ITEMS*`,
      ...d.items.map((i: any) => `${i.name} x${i.quantity} — ${fmt(i.totalPrice)}`),
      ``,
      `Subtotal: ${fmt(d.subtotal)}`,
      d.taxAmount > 0 ? `Tax: ${fmt(d.taxAmount)}` : '',
      d.discountAmount > 0 ? `Discount: -${fmt(d.discountAmount)}` : '',
      `*TOTAL: ${fmt(d.totalAmount)}*`,
      ``,
      `Payment: ${d.paymentMethod.replace('_',' ')}`,
      ``,
      `Thank you for visiting ${d.outletName}! 🙏`,
    ].filter(Boolean).join('\n')

    const encoded = encodeURIComponent(lines)
    // Try WhatsApp Web first, fallback to app
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    const waUrl = isMobile ? `whatsapp://send?text=${encoded}` : `https://web.whatsapp.com/send?text=${encoded}`
    window.open(waUrl, '_blank')
  }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, color:C.m }}>Loading receipt...</div>

  // Demo receipt if no ID
  const data: ReceiptData = receipt ?? {
    billNumber: 'BILL-20260418-1234',
    orderNumber: 'ORD-20260418-5678',
    outletName: 'RestoPOS Demo',
    outletAddress: 'Kampala, Uganda',
    outletPhone: '+256 700 000000',
    tableNo: 'T4',
    orderType: 'DINE_IN',
    items: [
      { name: 'Grilled Chicken', quantity: 2, unitPrice: 25000, totalPrice: 50000 },
      { name: 'Fresh Juice', quantity: 2, unitPrice: 6000, totalPrice: 12000 },
      { name: 'Chips', quantity: 1, unitPrice: 8000, totalPrice: 8000 },
    ],
    subtotal: 70000,
    taxAmount: 12600,
    discountAmount: 0,
    totalAmount: 82600,
    paymentMethod: 'CASH',
    amountPaid: 100000,
    changeGiven: 17400,
    paidAt: new Date().toISOString(),
    cashierName: session?.user.name ?? 'Cashier',
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'20px' }}>
      {/* Action buttons - hidden when printing */}
      <div className="no-print" style={{ display:'flex', gap:'10px', justifyContent:'center', marginBottom:'20px', flexWrap:'wrap' }}>
        <button onClick={() => router.back()} style={{ padding:'10px 18px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.m, cursor:'pointer', fontSize:'13px' }}>← Back</button>
        <button onClick={handlePrint} style={{ padding:'10px 18px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer', fontWeight:'700', fontSize:'13px' }}>🖨️ Print Receipt</button>
        <button onClick={handleWhatsApp} style={{ padding:'10px 18px', borderRadius:'8px', background:'#22c55e', border:'none', color:'white', cursor:'pointer', fontWeight:'700', fontSize:'13px' }}>📱 Share on WhatsApp</button>
      </div>

      {/* Receipt */}
      <div id="receipt" style={{ background:'white', color:'#111', maxWidth:'320px', margin:'0 auto', padding:'24px 20px', borderRadius:'8px', fontFamily:'monospace' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'16px' }}>
          <div style={{ fontSize:'24px', marginBottom:'4px' }}>🍽️</div>
          <h2 style={{ fontSize:'16px', fontWeight:'700', margin:'0 0 4px' }}>{data.outletName}</h2>
          <p style={{ fontSize:'11px', color:'#555', margin:'0' }}>{data.outletAddress}</p>
          <p style={{ fontSize:'11px', color:'#555', margin:'2px 0 0' }}>{data.outletPhone}</p>
        </div>

        <div style={{ borderTop:'1px dashed #ccc', margin:'12px 0' }} />

        {/* Bill info */}
        <div style={{ fontSize:'11px', marginBottom:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>Receipt:</span><span style={{ fontWeight:'700' }}>{data.billNumber}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>Order:</span><span>{data.orderNumber}</span></div>
          {data.tableNo && <div style={{ display:'flex', justifyContent:'space-between' }}><span>Table:</span><span>{data.tableNo}</span></div>}
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>Type:</span><span>{data.orderType.replace('_',' ')}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>Date:</span><span>{new Date(data.paidAt).toLocaleString()}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>Cashier:</span><span>{data.cashierName}</span></div>
        </div>

        <div style={{ borderTop:'1px dashed #ccc', margin:'12px 0' }} />

        {/* Items */}
        <div style={{ marginBottom:'12px' }}>
          {data.items.map((item, i) => (
            <div key={i} style={{ marginBottom:'6px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', fontWeight:'600' }}>
                <span>{item.name}</span>
                <span>{fmt(item.totalPrice)}</span>
              </div>
              <div style={{ fontSize:'11px', color:'#666' }}>{item.quantity} × {fmt(item.unitPrice)}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop:'1px dashed #ccc', margin:'12px 0' }} />

        {/* Totals */}
        <div style={{ fontSize:'12px', marginBottom:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}><span>Subtotal</span><span>{fmt(data.subtotal)}</span></div>
          {data.taxAmount > 0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}><span>Tax (18%)</span><span>{fmt(data.taxAmount)}</span></div>}
          {data.discountAmount > 0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', color:'green' }}><span>Discount</span><span>-{fmt(data.discountAmount)}</span></div>}
        </div>

        <div style={{ borderTop:'2px solid #111', padding:'10px 0', marginBottom:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'16px', fontWeight:'700' }}>
            <span>TOTAL</span><span>{fmt(data.totalAmount)}</span>
          </div>
        </div>

        {/* Payment */}
        <div style={{ fontSize:'12px', marginBottom:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}><span>Payment</span><span>{data.paymentMethod.replace('_',' ')}</span></div>
          {data.amountPaid > data.totalAmount && <>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}><span>Paid</span><span>{fmt(data.amountPaid)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'700' }}><span>Change</span><span>{fmt(data.changeGiven)}</span></div>
          </>}
        </div>

        <div style={{ borderTop:'1px dashed #ccc', margin:'12px 0' }} />

        {/* Footer */}
        <div style={{ textAlign:'center', fontSize:'11px', color:'#555' }}>
          <p style={{ margin:'0 0 4px', fontWeight:'700' }}>Thank you for your visit!</p>
          <p style={{ margin:'0' }}>Please come again 🙏</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #receipt { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#09090b', color:'#71717a' }}>Loading receipt...</div>}>
      <ReceiptContent />
    </Suspense>
  )
}
