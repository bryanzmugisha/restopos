'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

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

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500)
  }

  const changePin = async () => {
    if (!newPin || newPin.length < 4) { showToast('New PIN must be at least 4 digits', 'err'); return }
    if (newPin !== confirmPin) { showToast('PINs do not match', 'err'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/profile/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      })
      const data = await res.json()
      if (res.ok) { showToast('✅ PIN changed successfully'); setCurrentPin(''); setNewPin(''); setConfirmPin('') }
      else showToast('❌ ' + data.error, 'err')
    } catch { showToast('❌ Error changing PIN', 'err') }
    setSaving(false)
  }

  const changePassword = async () => {
    if (!newPwd || newPwd.length < 6) { showToast('Password must be at least 6 characters', 'err'); return }
    if (newPwd !== confirmPwd) { showToast('Passwords do not match', 'err'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (res.ok) { showToast('✅ Password changed. Please log in again.'); setTimeout(() => signOut({ callbackUrl: '/login' }), 2000) }
      else showToast('❌ ' + data.error, 'err')
    } catch { showToast('❌ Error changing password', 'err') }
    setSaving(false)
  }

  const roleColors: Record<string,string> = { ADMIN:'#a855f7', MANAGER:'#3b82f6', CASHIER:'#22c55e', WAITER:'#f97316', KITCHEN_STAFF:'#ef4444', DELIVERY_STAFF:'#f59e0b' }
  const C = { bg:'#09090b', s:'#18181b', b:'#27272a', t:'#fafafa', m:'#71717a', br:'#f97316' }

  const Field = ({ label, value, onChange, type='text', ph='', eye=false }: any) => (
    <div style={{ marginBottom:'14px' }}>
      <label style={{ display:'block', color:'#a1a1aa', fontSize:'12px', marginBottom:'5px' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input type={eye && !show ? 'password' : type} value={value} onChange={e => onChange(e.target.value)} placeholder={ph}
          style={{ width:'100%', padding:`9px ${eye?'40px':'12px'} 9px 12px`, borderRadius:'8px', background:'#27272a', border:`1px solid ${C.b}`, color:C.t, fontSize:'14px', outline:'none' }} />
        {eye && <button type="button" onClick={() => setShow(v=>!v)} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.m, fontSize:'15px' }}>{show?'🙈':'👁️'}</button>}
      </div>
    </div>
  )

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg }}>
      {toast && <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:toastType==='ok'?'#14532d':'#450a0a', border:`1px solid ${toastType==='ok'?'#22c55e':'#7f1d1d'}`, borderRadius:'10px', padding:'12px 24px', color:toastType==='ok'?'#22c55e':'#fca5a5', fontWeight:'600', fontSize:'14px' }}>{toast}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.b}`, flexShrink:0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:C.m, cursor:'pointer', fontSize:'20px' }}>←</button>
        <h1 style={{ fontSize:'18px', fontWeight:'700', color:C.t, flex:1 }}>👤 My Profile</h1>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
        <div style={{ maxWidth:'480px' }}>
          {/* Profile card */}
          <div style={{ background:C.s, border:`1px solid ${C.b}`, borderRadius:'14px', padding:'20px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'16px' }}>
            <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'#27272a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:'700', color:roleColors[session?.user.role ?? 'WAITER'] ?? C.br }}>
              {session?.user.name?.charAt(0) ?? 'U'}
            </div>
            <div>
              <p style={{ color:C.t, fontWeight:'700', fontSize:'18px' }}>{session?.user.name}</p>
              <p style={{ color:C.m, fontSize:'13px' }}>{session?.user.email || 'No email set'}</p>
              <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'999px', background:(roleColors[session?.user.role??'']+'22'), color:roleColors[session?.user.role??'']??C.br, fontWeight:'700' }}>
                {session?.user.role?.replace(/_/g,' ')}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:`1px solid ${C.b}`, marginBottom:'20px' }}>
            {([['pin','🔢 Change PIN'],['password','🔑 Change Password']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)} style={{ padding:'10px 20px', background:'none', border:'none', borderBottom:`2px solid ${tab===v?C.br:'transparent'}`, color:tab===v?C.br:C.m, cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>{l}</button>
            ))}
          </div>

          {tab === 'pin' ? (
            <div>
              <Field label="Current PIN" value={currentPin} onChange={setCurrentPin} ph="Your current PIN" eye type="text" />
              <Field label="New PIN (4-6 digits)" value={newPin} onChange={(v: string) => setNewPin(v.replace(/\D/g,'').slice(0,6))} ph="New PIN" eye type="text" />
              <Field label="Confirm New PIN" value={confirmPin} onChange={(v: string) => setConfirmPin(v.replace(/\D/g,'').slice(0,6))} ph="Repeat new PIN" eye type="text" />
              <button onClick={changePin} disabled={saving}
                style={{ width:'100%', padding:'12px', borderRadius:'10px', background:C.br, border:'none', color:'white', fontWeight:'700', cursor:'pointer', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Update PIN'}
              </button>
            </div>
          ) : (
            <div>
              <Field label="Current Password" value={currentPwd} onChange={setCurrentPwd} ph="Your current password" eye />
              <Field label="New Password (min 6 chars)" value={newPwd} onChange={setNewPwd} ph="New password" eye />
              <Field label="Confirm New Password" value={confirmPwd} onChange={setConfirmPwd} ph="Repeat new password" eye />
              <button onClick={changePassword} disabled={saving}
                style={{ width:'100%', padding:'12px', borderRadius:'10px', background:C.br, border:'none', color:'white', fontWeight:'700', cursor:'pointer', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
