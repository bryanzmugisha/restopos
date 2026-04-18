'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface InvoiceData {
  orderNumber: string; outletName: string; outletAddress: string; outletPhone: string
  currency: string; tableNo?: string|null; orderType: string; orderStatus: string
  customerName?: string|null; customerPhone?: string|null
  waiterName?: string|null
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[]
  subtotal: number; taxAmount: number; totalAmount: number
  createdAt: string; notes?: string|null
}

function InvoiceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [invoice, setInvoice] = useState<InvoiceData|null>(null)
  const [loading, setLoading] = useState(true)
  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!orderId) { setLoading(false); return }
    fetch(`/api/invoice/${orderId}`)
      .then(r => r.json())
      .then(data => { if (data.orderNumber) setInvoice(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [orderId])

  const fmt = (n: number, c = 'UGX') => `${c} ${Math.round(n).toLocaleString()}`

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    if (!invoice) return
    const c = invoice.currency
    const lines = [
      `🍽️ *${invoice.outletName}*`,
      invoice.outletAddress || null,
      invoice.outletPhone ? `📞 ${invoice.outletPhone}` : null,
      ``,
      `📋 *INVOICE / ORDER SUMMARY*`,
      `Order No: ${invoice.orderNumber}`,
      invoice.tableNo ? `Table: ${invoice.tableNo}` : null,
      invoice.customerName ? `Customer: ${invoice.customerName}` : null,
      `Date: ${new Date(invoice.createdAt).toLocaleString()}`,
      `Served by: ${invoice.waiterName || 'Staff'}`,
      ``,
      `*ITEMS ORDERED*`,
      `${'─'.repeat(30)}`,
      ...invoice.items.map(i => `• ${i.name} ×${i.quantity}\n  ${fmt(i.unitPrice,c)} × ${i.quantity} = *${fmt(i.totalPrice,c)}*`),
      `${'─'.repeat(30)}`,
      ``,
      `Subtotal: ${fmt(invoice.subtotal,c)}`,
      invoice.taxAmount > 0 ? `Tax (18%): ${fmt(invoice.taxAmount,c)}` : null,
      ``,
      `*TOTAL DUE: ${fmt(invoice.totalAmount,c)}*`,
      ``,
      `_Payment pending — please proceed to cashier_`,
      ``,
      `Thank you for dining at *${invoice.outletName}*! 🙏`,
    ].filter(v => v !== null).join('\n')

    const encoded = encodeURIComponent(lines)
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    window.open(isMobile ? `whatsapp://send?text=${encoded}` : `https://web.whatsapp.com/send?text=${encoded}`, '_blank')
  }

  const handleSaveImage = async () => {
    if (!invoiceRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(invoiceRef.current, { backgroundColor: '#ffffff', scale: 2 })
      const link = document.createElement('a')
      link.download = `invoice-${invoice?.orderNumber}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { alert('Use Print > Save as PDF instead') }
  }

  const C = { bg: '#09090b', s: '#18181b', b: '#27272a', t: '#fafafa', m: '#71717a', br: '#f97316' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, color:C.m }}>Loading invoice...</div>

  if (!invoice) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, gap:'12px' }}>
      <p style={{ fontSize:'40px' }}>📋</p>
      <p style={{ color:C.m }}>Invoice not found</p>
      <button onClick={() => { if(window.history.length<=1) window.close(); else router.back() }} style={{ padding:'10px 24px', borderRadius:'8px', background:C.br, border:'none', color:'white', cursor:'pointer' }}>Go Back</button>
    </div>
  )

  const c = invoice.currency

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'16px', boxSizing:'border-box' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          #invoice-card { border-radius: 0 !important; max-width: 100% !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Action buttons */}
      <div className="no-print" style={{ display:'flex', gap:'8px', justifyContent:'center', marginBottom:'16px', flexWrap:'wrap', maxWidth:'380px', margin:'0 auto 16px' }}>
        <button onClick={() => { if(window.history.length<=1) window.close(); else router.back() }} style={{ padding:'10px 14px', borderRadius:'8px', background:C.s, border:`1px solid ${C.b}`, color:C.m, cursor:'pointer', fontSize:'13px' }}>← Back</button>
        <button onClick={handlePrint} style={{ flex:1, padding:'10px 14px', borderRadius:'8px', background:'#1e3a5f', border:'1px solid #3b82f6', color:'#60a5fa', cursor:'pointer', fontWeight:'700', fontSize:'13px' }}>🖨️ Print</button>
        <button onClick={handleWhatsApp} style={{ flex:1, padding:'10px 14px', borderRadius:'8px', background:'#052e16', border:'1px solid #22c55e', color:'#22c55e', cursor:'pointer', fontWeight:'700', fontSize:'13px' }}>📱 WhatsApp</button>
        <button onClick={handleSaveImage} style={{ flex:1, padding:'10px 14px', borderRadius:'8px', background:'#1a0f00', border:`1px solid ${C.br}`, color:C.br, cursor:'pointer', fontWeight:'700', fontSize:'13px' }}>🖼️ Image</button>
      </div>

      {/* Invoice card */}
      <div id="invoice-card" ref={invoiceRef}
        style={{ background:'white', color:'#111', maxWidth:'360px', margin:'0 auto', padding:'28px 24px', borderRadius:'8px', fontFamily:'"Helvetica Neue", Arial, sans-serif' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
          <div>
            <div style={{ fontSize:'24px', marginBottom:'4px' }}>🍽️</div>
            <h2 style={{ fontSize:'18px', fontWeight:'700', margin:'0 0 2px' }}>{invoice.outletName}</h2>
            {invoice.outletAddress && <p style={{ fontSize:'11px', color:'#666', margin:'0 0 1px' }}>{invoice.outletAddress}</p>}
            {invoice.outletPhone && <p style={{ fontSize:'11px', color:'#666', margin:0 }}>Tel: {invoice.outletPhone}</p>}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ background:'#f97316', color:'white', padding:'4px 10px', borderRadius:'4px', fontSize:'12px', fontWeight:'700', marginBottom:'6px' }}>INVOICE</div>
            <p style={{ fontSize:'12px', fontWeight:'600', margin:'0 0 2px' }}>{invoice.orderNumber}</p>
            <p style={{ fontSize:'11px', color:'#666', margin:0 }}>{new Date(invoice.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div style={{ borderTop:'2px solid #111', borderBottom:'1px solid #ddd', padding:'10px 0', marginBottom:'16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'12px' }}>
            {invoice.tableNo && <div><span style={{ color:'#666' }}>Table: </span><strong>{invoice.tableNo}</strong></div>}
            {invoice.customerName && <div><span style={{ color:'#666' }}>Customer: </span><strong>{invoice.customerName}</strong></div>}
            {invoice.customerPhone && <div><span style={{ color:'#666' }}>Phone: </span><strong>{invoice.customerPhone}</strong></div>}
            <div><span style={{ color:'#666' }}>Served by: </span><strong>{invoice.waiterName || 'Staff'}</strong></div>
            <div><span style={{ color:'#666' }}>Type: </span><strong>{invoice.orderType.replace('_',' ')}</strong></div>
            <div><span style={{ color:'#666' }}>Time: </span><strong>{new Date(invoice.createdAt).toLocaleTimeString()}</strong></div>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'16px', fontSize:'13px' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #ddd' }}>
              <th style={{ textAlign:'left', padding:'6px 4px', fontWeight:'600', color:'#555', fontSize:'11px', textTransform:'uppercase' }}>Item</th>
              <th style={{ textAlign:'center', padding:'6px 4px', fontWeight:'600', color:'#555', fontSize:'11px' }}>Qty</th>
              <th style={{ textAlign:'right', padding:'6px 4px', fontWeight:'600', color:'#555', fontSize:'11px' }}>Unit</th>
              <th style={{ textAlign:'right', padding:'6px 4px', fontWeight:'600', color:'#555', fontSize:'11px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} style={{ borderBottom:'1px solid #f0f0f0' }}>
                <td style={{ padding:'8px 4px', fontWeight:'500' }}>{item.name}</td>
                <td style={{ padding:'8px 4px', textAlign:'center', color:'#555' }}>{item.quantity}</td>
                <td style={{ padding:'8px 4px', textAlign:'right', color:'#555' }}>{fmt(item.unitPrice,c)}</td>
                <td style={{ padding:'8px 4px', textAlign:'right', fontWeight:'600' }}>{fmt(item.totalPrice,c)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop:'1px solid #ddd', paddingTop:'10px', marginBottom:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'13px' }}>
            <span style={{ color:'#555' }}>Subtotal</span><span>{fmt(invoice.subtotal,c)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'13px' }}>
              <span style={{ color:'#555' }}>Tax (18%)</span><span>{fmt(invoice.taxAmount,c)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'18px', fontWeight:'700', borderTop:'2px solid #111', paddingTop:'8px', marginTop:'6px' }}>
            <span>TOTAL DUE</span><span style={{ color:'#f97316' }}>{fmt(invoice.totalAmount,c)}</span>
          </div>
        </div>

        {/* Pending payment notice */}
        <div style={{ background:'#fff3cd', border:'1px solid #ffc107', borderRadius:'6px', padding:'10px', textAlign:'center', marginBottom:'16px' }}>
          <p style={{ fontSize:'12px', fontWeight:'700', color:'#856404', margin:0 }}>⏳ PAYMENT PENDING</p>
          <p style={{ fontSize:'11px', color:'#856404', margin:'3px 0 0' }}>Please proceed to the cashier to complete payment</p>
        </div>

        {invoice.notes && (
          <div style={{ background:'#f8f9fa', borderRadius:'6px', padding:'8px', marginBottom:'12px', fontSize:'12px', color:'#555' }}>
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}

        <div style={{ textAlign:'center', fontSize:'11px', color:'#999', borderTop:'1px dashed #ddd', paddingTop:'12px' }}>
          <p style={{ margin:'0 0 2px' }}>Thank you for choosing {invoice.outletName}!</p>
          <p style={{ margin:0 }}>Powered by RestoPOS · Brycore</p>
        </div>
      </div>
    </div>
  )
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#09090b', color:'#71717a' }}>Loading...</div>}>
      <InvoiceContent />
    </Suspense>
  )
}
