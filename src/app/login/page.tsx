'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'password' | 'pin'>('pin')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 4) submitPin(newPin)
  }

  const submitPin = async (p: string) => {
    setLoading(true)
    setError('')
    const res = await signIn('pin', {
      pin: p,
      outletId: 'outlet-1',
      redirect: false,
    })
    setLoading(false)
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid PIN')
      setPin('')
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid email or password')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: '#f97316', display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '28px', marginBottom: '12px',
          }}>🍽️</div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fafafa' }}>RestoPOS</h1>
          <p style={{ color: '#71717a', fontSize: '14px', marginTop: '4px' }}>Restaurant Management System</p>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: '#18181b', borderRadius: '10px',
          padding: '4px', marginBottom: '24px', border: '1px solid #27272a',
        }}>
          {(['pin', 'password'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); setPin('') }}
              style={{
                flex: 1, padding: '8px', borderRadius: '7px', border: 'none',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                background: mode === m ? '#f97316' : 'transparent',
                color: mode === m ? 'white' : '#71717a',
                transition: 'all 0.15s',
              }}>
              {m === 'pin' ? '🔢 PIN Login' : '🔑 Password'}
            </button>
          ))}
        </div>

        <div style={{
          background: '#18181b', border: '1px solid #27272a',
          borderRadius: '16px', padding: '24px',
        }}>
          {mode === 'pin' ? (
            <div>
              <p style={{ textAlign: 'center', color: '#a1a1aa', fontSize: '14px', marginBottom: '20px' }}>
                Enter your 4-digit PIN
              </p>
              {/* PIN dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: i < pin.length ? '#f97316' : '#3f3f46',
                    transition: 'background 0.15s',
                  }} />
                ))}
              </div>
              {/* Numpad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                  <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : d && handlePinDigit(d)}
                    disabled={!d || loading}
                    style={{
                      padding: '18px', borderRadius: '10px', border: '1px solid #27272a',
                      background: d ? '#27272a' : 'transparent',
                      color: '#fafafa', fontSize: '20px', fontWeight: '600',
                      cursor: d ? 'pointer' : 'default',
                      opacity: !d ? 0 : 1,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if(d) (e.target as HTMLElement).style.background = '#3f3f46' }}
                    onMouseLeave={e => { if(d) (e.target as HTMLElement).style.background = '#27272a' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '13px', marginBottom: '6px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@restopos.com"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: '#27272a', border: '1px solid #3f3f46',
                    color: '#fafafa', fontSize: '14px', outline: 'none',
                  }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '13px', marginBottom: '6px' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: '#27272a', border: '1px solid #3f3f46',
                    color: '#fafafa', fontSize: '14px', outline: 'none',
                  }} />
              </div>
              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  background: '#f97316', border: 'none', color: 'white',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {error && (
            <div style={{
              marginTop: '16px', padding: '10px 14px', borderRadius: '8px',
              background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5',
              fontSize: '13px', textAlign: 'center',
            }}>{error}</div>
          )}
        </div>

        {/* Demo creds hint */}
        <div style={{
          marginTop: '16px', padding: '12px', borderRadius: '10px',
          background: '#18181b', border: '1px solid #27272a',
          fontSize: '12px', color: '#71717a',
        }}>
          <p style={{ fontWeight: '600', color: '#a1a1aa', marginBottom: '6px' }}>Demo PINs:</p>
          <p>Admin: <span style={{ color: '#f97316' }}>1234</span> &nbsp; Waiter: <span style={{ color: '#f97316' }}>2222</span></p>
          <p>Cashier: <span style={{ color: '#f97316' }}>3333</span> &nbsp; Kitchen: <span style={{ color: '#f97316' }}>4444</span></p>
        </div>
      </div>
    </div>
  )
}
