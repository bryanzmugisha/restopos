'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'outlet'|'tax'|'receipt'|'users'|'payment'>('outlet')
  const [saved, setSaved] = useState(false)

  const [outlet, setOutlet] = useState({ name:'RestoPOS Demo', address:'Kampala, Uganda', phone:'+256 700 000000', email:'info@restopos.com', currency:'UGX', taxNumber:'UG-VAT-123456' })
  const [tax, setTax] = useState({ vatEnabled: true, vatRate: 18, serviceCharge: 0, inclusive: false })
  const [receipt, setReceipt] = useState({ header:'Welcome to RestoPOS Demo', footer:'Thank you for your business! Visit us again.', showLogo: true, showTax: true, paperWidth: '80mm' })
  const [payment, setPayment] = useState({ cash: true, card: true, mobileMoney: true, roomFolio: false, creditAccount: false })
  const [users] = useState([
    { name:'Admin', role:'ADMIN', pin:'1234', email:'admin@restopos.com', active: true },
    { name:'John Waiter', role:'WAITER', pin:'2222', email:'waiter@restopos.com', active: true },
    { name:'Mary Cashier', role:'CASHIER', pin:'3333', email:'cashier@restopos.com', active: true },
    { name:'Chef Kitchen', role:'KITCHEN_STAFF', pin:'4444', email:'kitchen@restopos.com', active: true },
  ])

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  const Field = ({ label, value, onChange, type='text', ph='' }: { label: string; value: string|number; onChange: (v: string)=>void; type?: string; ph?: string }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={ph}
        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }} />
    </div>
  )

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean)=>void }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.b}` }}>
      <div>
        <p style={{ color: C.t, fontSize: '14px', fontWeight: '500' }}>{label}</p>
        {desc && <p style={{ color: C.m, fontSize: '12px', marginTop: '2px' }}>{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: value ? C.br : '#3f3f46', position: 'relative', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: '3px', left: value ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </button>
    </div>
  )

  const tabs = [
    { id: 'outlet',  label: '🏪 Outlet' },
    { id: 'tax',     label: '🧾 Tax' },
    { id: 'receipt', label: '🖨️ Receipt' },
    { id: 'payment', label: '💳 Payment' },
    { id: 'users',   label: '👤 Users' },
  ] as const

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.m, cursor: 'pointer', fontSize: '20px' }}>←</button>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: C.t, flex: 1 }}>⚙️ Settings</h1>
        {tab !== 'users' && (
          <button onClick={save} style={{ padding: '8px 18px', borderRadius: '8px', background: saved ? '#22c55e' : C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'background 0.3s' }}>
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: '200px', borderRight: `1px solid ${C.b}`, padding: '12px 8px', flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none', textAlign: 'left', background: tab===t.id ? '#1a0f00' : 'transparent', color: tab===t.id ? C.br : C.m, cursor: 'pointer', fontSize: '13px', fontWeight: tab===t.id ? '700' : '400', marginBottom: '2px', transition: 'all 0.12s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '520px' }}>

            {tab === 'outlet' && <>
              <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>Outlet Information</h2>
              <Field label="Restaurant Name" value={outlet.name} onChange={v => setOutlet(x=>({...x,name:v}))} />
              <Field label="Address" value={outlet.address} onChange={v => setOutlet(x=>({...x,address:v}))} />
              <Field label="Phone" value={outlet.phone} onChange={v => setOutlet(x=>({...x,phone:v}))} />
              <Field label="Email" value={outlet.email} onChange={v => setOutlet(x=>({...x,email:v}))} type="email" />
              <Field label="Tax / VAT Registration Number" value={outlet.taxNumber} onChange={v => setOutlet(x=>({...x,taxNumber:v}))} />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Currency</label>
                <select value={outlet.currency} onChange={e => setOutlet(x=>({...x,currency:e.target.value}))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none' }}>
                  {['UGX','KES','TZS','USD','EUR','GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>}

            {tab === 'tax' && <>
              <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>Tax Configuration</h2>
              <Toggle label="Enable VAT" desc="Apply VAT to all bills" value={tax.vatEnabled} onChange={v => setTax(x=>({...x,vatEnabled:v}))} />
              {tax.vatEnabled && (
                <div style={{ padding: '16px 0' }}>
                  <Field label="VAT Rate (%)" value={tax.vatRate} onChange={v => setTax(x=>({...x,vatRate:Number(v)}))} type="number" />
                  <Toggle label="Inclusive Pricing" desc="Prices already include VAT" value={tax.inclusive} onChange={v => setTax(x=>({...x,inclusive:v}))} />
                </div>
              )}
              <div style={{ marginTop: '8px' }}>
                <Toggle label="Service Charge" desc="Add % service charge to bills" value={tax.serviceCharge > 0} onChange={v => setTax(x=>({...x,serviceCharge:v?10:0}))} />
                {tax.serviceCharge > 0 && <Field label="Service Charge (%)" value={tax.serviceCharge} onChange={v => setTax(x=>({...x,serviceCharge:Number(v)}))} type="number" />}
              </div>
              <div style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: '#18181b', border: `1px solid ${C.b}` }}>
                <p style={{ color: C.m, fontSize: '12px', marginBottom: '8px' }}>Preview on UGX 100,000 bill</p>
                {[
                  { label: 'Subtotal', value: 'UGX 100,000' },
                  tax.vatEnabled ? { label: `VAT ${tax.vatRate}%`, value: `UGX ${(100000*tax.vatRate/100).toLocaleString()}` } : null,
                  tax.serviceCharge > 0 ? { label: `Service ${tax.serviceCharge}%`, value: `UGX ${(100000*tax.serviceCharge/100).toLocaleString()}` } : null,
                  { label: 'Total', value: `UGX ${(100000 + (tax.vatEnabled?100000*tax.vatRate/100:0) + 100000*tax.serviceCharge/100).toLocaleString()}` },
                ].filter(Boolean).map((r:any) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: C.m, fontSize: '13px' }}>{r.label}</span>
                    <span style={{ color: C.t, fontSize: '13px', fontWeight: r.label==='Total'?'700':'400' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </>}

            {tab === 'receipt' && <>
              <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>Receipt Template</h2>
              <Field label="Header Text" value={receipt.header} onChange={v => setReceipt(x=>({...x,header:v}))} ph="Welcome message at top of receipt" />
              <Field label="Footer Text" value={receipt.footer} onChange={v => setReceipt(x=>({...x,footer:v}))} ph="Thank you message at bottom" />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Paper Width</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['58mm','80mm'].map(w => (
                    <button key={w} onClick={() => setReceipt(x=>({...x,paperWidth:w}))}
                      style={{ flex: 1, padding: '9px', borderRadius: '8px', border: `1px solid ${receipt.paperWidth===w ? C.br : C.b}`, background: receipt.paperWidth===w ? '#1a0f00' : 'transparent', color: receipt.paperWidth===w ? C.br : C.m, cursor: 'pointer', fontWeight: '600' }}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Show Logo" value={receipt.showLogo} onChange={v => setReceipt(x=>({...x,showLogo:v}))} />
              <Toggle label="Show Tax Breakdown" value={receipt.showTax} onChange={v => setReceipt(x=>({...x,showTax:v}))} />

              {/* Receipt preview */}
              <div style={{ marginTop: '20px', background: 'white', borderRadius: '10px', padding: '16px', color: '#111', fontFamily: 'monospace', fontSize: '12px', maxWidth: '240px' }}>
                <p style={{ textAlign: 'center', fontWeight: '700', marginBottom: '4px' }}>{outlet.name}</p>
                <p style={{ textAlign: 'center', color: '#555', marginBottom: '4px' }}>{outlet.phone}</p>
                <p style={{ textAlign: 'center', marginBottom: '8px', fontSize: '11px' }}>{receipt.header}</p>
                <p style={{ borderTop: '1px dashed #ccc', paddingTop: '8px', marginBottom: '6px' }}>Grilled Chicken x1  25,000</p>
                <p style={{ marginBottom: '6px' }}>Soda x2           6,000</p>
                <p style={{ borderTop: '1px dashed #ccc', paddingTop: '8px', marginBottom: '4px' }}>Subtotal:      31,000</p>
                {receipt.showTax && <p style={{ marginBottom: '4px' }}>VAT 18%:        5,580</p>}
                <p style={{ borderTop: '1px solid #aaa', paddingTop: '6px', fontWeight: '700', marginBottom: '8px' }}>TOTAL:        36,580</p>
                <p style={{ textAlign: 'center', fontSize: '11px', color: '#555' }}>{receipt.footer}</p>
              </div>
            </>}

            {tab === 'payment' && <>
              <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>Payment Methods</h2>
              <Toggle label="Cash" desc="Accept cash payments" value={payment.cash} onChange={v => setPayment(x=>({...x,cash:v}))} />
              <Toggle label="Debit / Credit Card" desc="Card terminal payments" value={payment.card} onChange={v => setPayment(x=>({...x,card:v}))} />
              <Toggle label="Mobile Money" desc="MTN, Airtel, and others" value={payment.mobileMoney} onChange={v => setPayment(x=>({...x,mobileMoney:v}))} />
              <Toggle label="Room Folio" desc="Post to hotel room (for hotel restaurants)" value={payment.roomFolio} onChange={v => setPayment(x=>({...x,roomFolio:v}))} />
              <Toggle label="Credit Account" desc="Allow trusted customers to pay later" value={payment.creditAccount} onChange={v => setPayment(x=>({...x,creditAccount:v}))} />
            </>}

            {tab === 'users' && <>
              <h2 style={{ color: C.t, fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>System Users</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {users.map((u, i) => (
                  <div key={i} style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: C.br }}>
                      {u.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: C.t, fontWeight: '600', fontSize: '14px' }}>{u.name}</p>
                      <p style={{ color: C.m, fontSize: '12px' }}>{u.email}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: '#27272a', color: C.br, fontWeight: '700' }}>{u.role.replace('_',' ')}</span>
                      <p style={{ color: '#52525b', fontSize: '11px', marginTop: '4px' }}>PIN: {u.pin}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/dashboard')} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '8px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                + Add User (coming next)
              </button>
            </>}

          </div>
        </div>
      </div>
    </div>
  )
}
