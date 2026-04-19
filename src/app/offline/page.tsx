'use client'
export default function OfflinePage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', background:'#09090b', gap:'16px', fontFamily:'system-ui' }}>
      <div style={{ fontSize:'64px' }}>🍽️</div>
      <h1 style={{ color:'#fafafa', fontSize:'24px', fontWeight:'700', margin:0 }}>RestoPOS</h1>
      <p style={{ color:'#71717a', fontSize:'16px', margin:0 }}>No internet connection</p>
      <p style={{ color:'#52525b', fontSize:'14px', margin:0, textAlign:'center', maxWidth:'280px' }}>Check your connection and try again</p>
      <button onClick={() => window.location.reload()} style={{ marginTop:'8px', padding:'12px 28px', background:'#f97316', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'16px', fontWeight:'600' }}>
        Try Again
      </button>
    </div>
  )
}
