'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'pin'|'password'>('pin')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok'|'err'>('ok')

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => { setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500) }

  const changePin = async () => {
    if (newPin.length < 4) { showToast('PIN must be at least 4 digits', 'err'); return }
    if (newPin !== confirmPin) { showToast('PINs do not match', 'err'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/profile/change-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('✅ PIN updated successfully')
        setCurrentPin(''); setNewPin(''); setConfirmPin('')
      } else showToast('❌ ' + data.error, 'err')
    } catch { showToast('❌ Error', 'err') }
    setSaving(false)
  }

  const changePassword = async () => {
    if (newPwd.length < 6) { showToast('Password must be at least 6 characters', 'err'); return }
    if (newPwd !== confirmPwd) { showToast('Passwords do not match', 'err'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('✅ Password updated successfully')
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      } else showToast('❌ ' + data.error, 'err')
    } catch { showToast('❌ Error', 'err') }
    setSaving(false)
  }

  const roleColors: Record<string,string> = { ADMIN:'#a855f7', MANAGER:'#3b82f6', CASHIER:'#22c55e', WAITER:'#f97316', KITCHEN_STAFF:'#ef4444', BAR_STAFF:'#6366f1', DELIVERY_STAFF:'#f59e0b' }
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  const inputStyle = { width: '100%', padding: '11px 40px 11px 14px', borderRadius: '10px', background: '#27272a', border: '1px solid #27272a', color: '#fafafa', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const }
  const eyeBtnStyle = { position: 'absolute' as const, right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.m, fontSize: '16px' }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {toast && <div style={{ position: 'fixed', top: 'max(16px,env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: toastType === 'ok' ? '#14532d' : '#450a0a', border: `1px solid ${toastType === 'ok' ? '#22c55e' : '#7f1d1d'}`, borderRadius: '10px', padding: '12px 24px', color: toastType === 'ok' ? '#22c55e' : '#fca5a5', fontWeight: '600', fontSize: '14px' }}>{toast}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, paddingTop: 'max(12px,env(safe-area-inset-top))' }}>
        <button onClick={() => router.push('/dashboard')} style={{ width: '40px', height: '40px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, cursor: 'pointer', fontSize: '18px' }}>←</button>
        <h1 style={{ fontSize: '17px', fontWeight: '700', color: C.t, flex: 1, margin: 0 }}>👤 My Profile</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '16px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* Profile info card */}
          <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: roleColors[session?.user.role ?? ''] ?? C.br, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: 'white' }}>
              {session?.user.name?.charAt(0) ?? '?'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.t, fontWeight: '700', fontSize: '18px', margin: '0 0 4px' }}>{session?.user.name}</p>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: (roleColors[session?.user.role ?? ''] ?? C.br) + '22', color: roleColors[session?.user.role ?? ''] ?? C.br, fontWeight: '700' }}>{session?.user.role?.replace(/_/g, ' ')}</span>
              {session?.user.email && <p style={{ color: C.m, fontSize: '12px', margin: '4px 0 0' }}>{session.user.email}</p>}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: C.s, borderRadius: '10px', padding: '4px' }}>
            <button onClick={() => setTab('pin')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: tab === 'pin' ? C.br : 'transparent', color: tab === 'pin' ? 'white' : C.m, cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>🔢 Change PIN</button>
            <button onClick={() => setTab('password')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: tab === 'password' ? C.br : 'transparent', color: tab === 'password' ? 'white' : C.m, cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>🔒 Change Password</button>
          </div>

          {/* PIN change */}
          {tab === 'pin' && (
            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '20px' }}>
              <p style={{ color: C.m, fontSize: '13px', marginBottom: '16px' }}>Your PIN is used for quick login in the app.</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Current PIN</label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Your current PIN" inputMode="numeric" style={inputStyle} />
                  <button type="button" onClick={() => setShow(v => !v)} style={eyeBtnStyle}>{show ? '🙈' : '👁️'}</button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>New PIN (4-6 digits)</label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="New PIN" inputMode="numeric" style={inputStyle} />
                  <button type="button" onClick={() => setShow(v => !v)} style={eyeBtnStyle}>{show ? '🙈' : '👁️'}</button>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Confirm New PIN</label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Repeat new PIN" inputMode="numeric" style={inputStyle} />
                  <button type="button" onClick={() => setShow(v => !v)} style={eyeBtnStyle}>{show ? '🙈' : '👁️'}</button>
                </div>
              </div>

              <button onClick={changePin} disabled={saving || !currentPin || !newPin} style={{ width: '100%', padding: '13px', borderRadius: '10px', background: (currentPin && newPin) ? C.br : '#27272a', border: 'none', color: 'white', cursor: (currentPin && newPin) ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '15px', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Updating...' : 'Update PIN'}
              </button>
            </div>
          )}

          {/* Password change */}
          {tab === 'password' && (
            <div style={{ background: C.s, border: `1px solid ${C.b}`, borderRadius: '14px', padding: '20px' }}>
              <p style={{ color: C.m, fontSize: '13px', marginBottom: '16px' }}>Your password is used for email login and sensitive actions.</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Your current password" style={inputStyle} />
                  <button type="button" onClick={() => setShow(v => !v)} style={eyeBtnStyle}>{show ? '🙈' : '👁️'}</button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>New Password (min 6 chars)</label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password" style={inputStyle} />
                  <button type="button" onClick={() => setShow(v => !v)} style={eyeBtnStyle}>{show ? '🙈' : '👁️'}</button>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '12px', marginBottom: '5px' }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repeat new password" style={inputStyle} />
                  <button type="button" onClick={() => setShow(v => !v)} style={eyeBtnStyle}>{show ? '🙈' : '👁️'}</button>
                </div>
              </div>

              <button onClick={changePassword} disabled={saving || !currentPwd || !newPwd} style={{ width: '100%', padding: '13px', borderRadius: '10px', background: (currentPwd && newPwd) ? C.br : '#27272a', border: 'none', color: 'white', cursor: (currentPwd && newPwd) ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '15px', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}

          <div style={{ height: '80px' }} />
        </div>
      </div>
    </div>
  )
}
