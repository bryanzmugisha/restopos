'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'general'|'receipt'|'ura'>('general')
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', currency: 'UGX',
    receiptFooter: 'Thank you for your visit! Please come again.',
    taxRate: '18', logoUrl: '',
  })
  const [ura, setUra] = useState({ enabled: false, tin: '', deviceSerial: '', environment: 'sandbox' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data?.name) setForm(f => ({
        ...f,
        name: data.name ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        currency: data.currency ?? 'UGX',
      }))
    })
  }, [])

  const showToast = (msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(''), 3000) }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) showToast('✅ Settings saved')
      else showToast('❌ Failed to save', false)
    } catch { showToast('❌ Error', false) }
    setSaving(false)
  }

  const C = { bg: '#09090b', s: '#18181b', b: '#27272a', t: '#fafafa', m: '#71717a', br: '#f97316' }
  const isAdmin = ['ADMIN','MANAGER'].includes(session?.user.role ?? '')

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', background: isAdmin ? '#27272a' : '#111', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      {toast && <div style={{ position: 'fixed', top: 'max(16px,env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: toastOk ? '#14532d' : '#450a0a', border: `1px solid ${toastOk ? '#22c55e' : '#7f1d1d'}`, borderRadius: '10px', padding: '12px 24px', color: toastOk ? '#22c55e' : '#fca5a5', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, paddingTop: 'max(12px,env(safe-area-inset-top))' }}>
        <button onClick={() => router.push('/dashboard')} style={{ width: '40px', height: '40px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, cursor: 'pointer', fontSize: '18px' }}>←</button>
        <h1 style={{ fontSize: '16px', fontWeight: '700', color: C.t, flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>⚙️ Settings — {form.name || 'Restaurant'}</h1>
        {isAdmin && <button onClick={save} disabled={saving} style={{ padding: '8px 16px', borderRadius: '8px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '13px', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.b}`, flexShrink: 0, overflowX: 'auto' }}>
        {([['general','🏪 General'],['receipt','🧾 Receipt'],['ura','🏛️ URA']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === v ? C.br : 'transparent'}`, color: tab === v ? C.br : C.m, cursor: 'pointer', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>{l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '16px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>

          {tab === 'general' && (
            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ color: C.t, fontWeight: '700', marginBottom: '16px' }}>Restaurant Details</h3>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Restaurant / Bar Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cuvette Bar & Grill" disabled={!isAdmin} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Kampala, Uganda" disabled={!isAdmin} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+256 700 000000" disabled={!isAdmin} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@restaurant.com" disabled={!isAdmin} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} disabled={!isAdmin} style={inputStyle}>
                  {['UGX','KES','TZS','USD','EUR','GBP','ZAR','NGN','GHS'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Logo URL (optional)</label>
                <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://yoursite.com/logo.png" disabled={!isAdmin} style={inputStyle} />
                <p style={{ color: C.m, fontSize: '12px', marginTop: '4px' }}>Upload logo to imgbb.com or cloudinary.com and paste link above — appears on receipts</p>
              </div>
            </div>
          )}

          {tab === 'receipt' && (
            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ color: C.t, fontWeight: '700', marginBottom: '16px' }}>Receipt Settings</h3>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Tax Rate (%)</label>
                <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} placeholder="18" disabled={!isAdmin} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Receipt Footer Message</label>
                <textarea value={form.receiptFooter} onChange={e => setForm(f => ({ ...f, receiptFooter: e.target.value }))} rows={3} disabled={!isAdmin} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
              </div>

              <p style={{ color: C.m, fontSize: '12px', marginBottom: '10px' }}>Preview:</p>
              <div style={{ background: 'white', color: '#111', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '12px' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  {form.logoUrl && <img src={form.logoUrl} alt="logo" style={{ height: '40px', display: 'block', margin: '0 auto 8px' }} />}
                  <strong style={{ fontSize: '14px' }}>{form.name || 'Restaurant Name'}</strong><br />
                  <span style={{ color: '#555', fontSize: '11px' }}>{form.address || 'Address'} · {form.phone || 'Phone'}</span>
                </div>
                <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0', padding: '6px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Item ×1</span><span>{form.currency} 25,000</span></div>
                  <div style={{ borderTop: '1px solid #111', margin: '6px 0', padding: '4px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>TOTAL</span><span>{form.currency} 25,000</span></div>
                </div>
                <div style={{ textAlign: 'center', color: '#555', fontSize: '11px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>{form.receiptFooter}</div>
              </div>
            </div>
          )}

          {tab === 'ura' && <>
            <div style={{ background: '#1a0f00', border: '1px solid #78350f', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ color: '#f59e0b', fontWeight: '700', fontSize: '14px', margin: '0 0 6px' }}>🏛️ URA EFRIS — Electronic Fiscal Receipting</p>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>Connect to Uganda Revenue Authority EFRIS to automatically submit invoices, generate tax-compliant receipts with QR codes, and comply with Uganda tax law.</p>
            </div>

            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <p style={{ color: C.t, fontWeight: '700', fontSize: '15px', margin: '0 0 2px' }}>Enable EFRIS Integration</p>
                  <p style={{ color: C.m, fontSize: '12px', margin: 0 }}>Auto-submit all invoices to URA</p>
                </div>
                <div onClick={() => setUra(u => ({ ...u, enabled: !u.enabled }))} style={{ width: '48px', height: '26px', borderRadius: '13px', background: ura.enabled ? '#22c55e' : '#3f3f46', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '3px', left: ura.enabled ? '24px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>

              {ura.enabled && <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>TIN (Tax Identification Number)</label>
                  <input value={ura.tin} onChange={e => setUra(u => ({ ...u, tin: e.target.value }))} placeholder="e.g. 1000012345" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>EFD Device Serial Number</label>
                  <input value={ura.deviceSerial} onChange={e => setUra(u => ({ ...u, deviceSerial: e.target.value }))} placeholder="e.g. UG123456789" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Environment</label>
                  <select value={ura.environment} onChange={e => setUra(u => ({ ...u, environment: e.target.value }))} style={inputStyle}>
                    <option value="sandbox">🧪 Sandbox (Testing)</option>
                    <option value="production">🔴 Production (Live)</option>
                  </select>
                </div>

                <button style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#14532d', border: '1px solid #22c55e', color: '#22c55e', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  Test Connection to URA EFRIS
                </button>
              </>}
            </div>

            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ color: C.t, fontWeight: '700', marginBottom: '14px', fontSize: '15px' }}>Setup Guide</h3>
              {[
                'Register at efris.ura.go.ug using your business TIN',
                'Apply for an EFD device at your nearest URA office',
                'Enter your TIN and Device Serial Number above',
                'Enable the toggle — every bill auto-submits to URA',
                'Receipts will include a URA QR code for verification',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: C.br, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ color: C.m, fontSize: '13px', margin: '2px 0 0' }}>{step}</p>
                </div>
              ))}
              <a href="https://efris.ura.go.ug" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: '8px', background: '#27272a', color: C.br, fontSize: '13px', textDecoration: 'none', marginTop: '12px', fontWeight: '600' }}>
                Open URA EFRIS Portal ↗
              </a>
            </div>
          </>}

          <div style={{ height: '80px' }} />
        </div>
      </div>
    </div>
  )
}
