'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'pin'|'password'>('pin')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDigit = (d: string) => {
    if (pin.length >= 6 || loading) return
    const p = pin + d
    setPin(p)
    if (p.length >= 4) setTimeout(() => submit(p), 400)
  }

  const submit = async (p: string) => {
    setLoading(true); setError('')
    const res = await signIn('pin', { pin: p, outletId: 'outlet-1', redirect: false })
    setLoading(false)
    if (res?.ok) router.push('/dashboard')
    else { setError('Invalid PIN — try again'); setPin('') }
  }

  const loginPwd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) router.push('/dashboard')
    else setError('Invalid email or password')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#09090b,#18181b)', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>

        {/* Logo & Title */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:'72px', height:'72px', borderRadius:'18px', background:'#f97316', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'32px', marginBottom:'14px', boxShadow:'0 8px 24px rgba(249,115,22,0.35)' }}>🍽️</div>
          <h1 style={{ fontSize:'26px', fontWeight:'700', color:'#fafafa', margin:'0 0 4px' }}>RestoPOS</h1>
          <p style={{ color:'#71717a', fontSize:'14px', margin:0 }}>Restaurant Management System</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display:'flex', background:'#18181b', borderRadius:'10px', padding:'4px', marginBottom:'24px', border:'1px solid #27272a' }}>
          {(['pin','password'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setPin('') }}
              style={{ flex:1, padding:'8px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:'500', background:mode===m?'#f97316':'transparent', color:mode===m?'white':'#71717a', transition:'all 0.15s' }}>
              {m === 'pin' ? '🔢 PIN Login' : '🔑 Password'}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background:'#18181b', border:'1px solid #27272a', borderRadius:'16px', padding:'24px' }}>
          {mode === 'pin' ? <>
            <p style={{ textAlign:'center', color:'#a1a1aa', fontSize:'14px', marginBottom:'20px' }}>Enter your PIN</p>
            <div style={{ display:'flex', justifyContent:'center', gap:'14px', marginBottom:'24px' }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ width:'13px', height:'13px', borderRadius:'50%', background:i < pin.length ? '#f97316' : '#3f3f46', transition:'background 0.15s', boxShadow:i < pin.length ? '0 0 8px #f97316' : 'none' }} />
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d,i) => (
                <button key={i} onClick={() => d === '⌫' ? setPin(p=>p.slice(0,-1)) : d && handleDigit(d)}
                  disabled={!d || loading}
                  style={{ padding:'18px', borderRadius:'10px', border:'1px solid #27272a', background:d?'#27272a':'transparent', color:'#fafafa', fontSize:'20px', fontWeight:'600', cursor:d?'pointer':'default', opacity:!d?0:1 }}
                  onMouseEnter={e=>{if(d)(e.target as HTMLElement).style.background='#3f3f46'}}
                  onMouseLeave={e=>{if(d)(e.target as HTMLElement).style.background='#27272a'}}>
                  {d}
                </button>
              ))}
            </div>
            {loading && <p style={{ textAlign:'center', color:'#71717a', fontSize:'13px', marginTop:'16px' }}>Verifying...</p>}
          </> : (
            <form onSubmit={loginPwd}>
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'13px', marginBottom:'6px' }}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" autoComplete="email"
                  style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', background:'#27272a', border:'1px solid #3f3f46', color:'#fafafa', fontSize:'14px', outline:'none' }} />
              </div>
              <div style={{ marginBottom:'20px' }}>
                <label style={{ display:'block', color:'#a1a1aa', fontSize:'13px', marginBottom:'6px' }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input type={showPwd?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password"
                    style={{ width:'100%', padding:'10px 40px 10px 12px', borderRadius:'8px', background:'#27272a', border:'1px solid #3f3f46', color:'#fafafa', fontSize:'14px', outline:'none' }} />
                  <button type="button" onClick={()=>setShowPwd(v=>!v)}
                    style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#71717a', fontSize:'16px' }}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'12px', borderRadius:'10px', background:'#f97316', border:'none', color:'white', fontSize:'15px', fontWeight:'600', cursor:'pointer', opacity:loading?0.7:1 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {error && (
            <div style={{ marginTop:'16px', padding:'10px', borderRadius:'8px', background:'#450a0a', border:'1px solid #7f1d1d', color:'#fca5a5', fontSize:'13px', textAlign:'center' }}>
              {error}
            </div>
          )}
        </div>

        {/* Brycore branding */}
        <div style={{ marginTop:'28px', textAlign:'center' }}>
          <p style={{ color:'#52525b', fontSize:'11px', marginBottom:'8px' }}>Powered by</p>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 16px', borderRadius:'10px', background:'#18181b', border:'1px solid #27272a' }}>
            {/* Brycore logo mark */}
            <div style={{ width:'24px', height:'24px', borderRadius:'6px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'800', color:'white' }}>B</div>
            <span style={{ color:'#a1a1aa', fontSize:'13px', fontWeight:'600', letterSpacing:'0.03em' }}>Brycore</span>
          </div>
          <p style={{ color:'#3f3f46', fontSize:'10px', marginTop:'8px' }}>© {new Date().getFullYear()} Brycore. All rights reserved.</p>
        </div>

      </div>
    </div>
  )
}
