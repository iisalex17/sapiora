'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_URL = 'https://owdvtgwuizxzgppqgtps.supabase.co'
const ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZHZ0Z3d1aXp4emdwcHFndHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODU5MDMsImV4cCI6MjA5Mjg2MTkwM30.hpNlm2eUX_zAgYF7Lud9Ru2QSJuHvYaR4EB-Lf9a-4A'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const routingRes = await fetch(
        `${ADMIN_URL}/rest/v1/user_routing?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: { apikey: ADMIN_KEY, Authorization: `Bearer ${ADMIN_KEY}` }}
      )
      const routing = await routingRes.json()

      if (!routing || routing.length === 0) {
        setError('Usuario no encontrado.')
        setLoading(false)
        return
      }

const { org_id, org_name, supabase_url, supabase_key } = routing[0]

// Get plan from organizations table
let plan = 'starter'
try {
  const orgRes = await fetch(
    `${ADMIN_URL}/rest/v1/organizations?org_id=eq.${encodeURIComponent(org_id)}&select=plan`,
    { headers: { apikey: ADMIN_KEY, Authorization: `Bearer ${ADMIN_KEY}` }}
  )
  const orgData = await orgRes.json()
  if (orgData && orgData[0]?.plan) plan = orgData[0].plan
} catch(e) {}

      const loginRes = await fetch(`${supabase_url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabase_key,
          Authorization: `Bearer ${supabase_key}`
        },
        body: JSON.stringify({ email, password })
      })

      const loginData = await loginRes.json()

      if (!loginRes.ok || loginData.error) {
        setError('Credenciales incorrectas.')
        setLoading(false)
        return
      }

// Get plan from organizations
let userPlan = 'starter'
try {
  const orgRes = await fetch(
    `${ADMIN_URL}/rest/v1/organizations?org_id=eq.${encodeURIComponent(org_id)}&select=plan`,
    { headers: { apikey: ADMIN_KEY, Authorization: `Bearer ${ADMIN_KEY}` }}
  )
  const orgData = await orgRes.json()
  if (orgData?.[0]?.plan) userPlan = orgData[0].plan
} catch(e) {}

sessionStorage.setItem('sapiora_session', JSON.stringify({
  access_token: loginData.access_token,
  email, org_id, org_name, supabase_url, supabase_key, plan: userPlan
}))

      router.push('/dashboard/pipeline')

    } catch (err: any) {
      setError('Error de conexión. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  const gold = '#C4A35A'
  const goldFaint = 'rgba(196,163,90,.15)'
  const goldFocus = 'rgba(196,163,90,.45)'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        .sapiora-input { transition: border-color .3s, background .3s; }
        .sapiora-input:focus { outline: none; border-color: ${goldFocus} !important; background: rgba(196,163,90,.04) !important; }
        .sapiora-input::placeholder { color: rgba(255,255,255,.15); }
        .sapiora-btn { transition: all .3s; }
        .sapiora-btn:hover { border-color: rgba(196,163,90,.7) !important; color: #e8c87a !important; }
        .sapiora-btn:active { transform: scale(.99); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .sapiora-card { animation: fadeUp .6s cubic-bezier(.34,1.56,.64,1) both; }
      `}</style>
      <div style={{
        minHeight:'100vh', background:'#060608', display:'flex',
        alignItems:'center', justifyContent:'center',
        fontFamily:"'DM Sans', sans-serif", position:'relative', overflow:'hidden'
      }}>
        {/* Grid background */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'linear-gradient(rgba(196,163,90,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(196,163,90,.04) 1px,transparent 1px)',
          backgroundSize:'40px 40px', pointerEvents:'none'
        }}/>
        {/* Glow */}
        <div style={{
          position:'absolute', width:'400px', height:'400px', borderRadius:'50%',
          background:'radial-gradient(circle,rgba(196,163,90,.06) 0%,transparent 70%)',
          top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none'
        }}/>

        {/* Card */}
        <div className="sapiora-card" style={{position:'relative', width:'360px', padding:'48px 40px'}}>
          {/* Corner decorations */}
          {[['0','0','1px 0 0 1px'],['0','auto','1px 1px 0 0'],['auto','0','0 0 1px 1px'],['auto','auto','0 1px 1px 0']].map(([t,r,bw],i) => (
            <div key={i} style={{
              position:'absolute', width:'16px', height:'16px',
              top: i<2 ? 0 : 'auto', bottom: i>=2 ? 0 : 'auto',
              left: i%2===0 ? 0 : 'auto', right: i%2===1 ? 0 : 'auto',
              borderColor:'rgba(196,163,90,.2)', borderStyle:'solid', borderWidth:bw
            }}/>
          ))}

          {/* Logo */}
          <div style={{display:'flex', alignItems:'baseline', gap:'2px', marginBottom:'8px'}}>
            <div style={{fontFamily:"'Cormorant Garamond', serif", fontSize:'32px', fontWeight:300, color:'#f0ede6', letterSpacing:'2px'}}>
              Sapiora
            </div>
            <div style={{width:'6px', height:'6px', borderRadius:'50%', background:gold, marginLeft:'2px', marginBottom:'6px', flexShrink:0}}/>
          </div>
          <div style={{fontSize:'9px', color:'rgba(255,255,255,.25)', letterSpacing:'3px', textTransform:'uppercase', marginBottom:'32px', fontWeight:300}}>
            Hospitality Intelligence
          </div>
          <div style={{width:'32px', height:'1px', background:`linear-gradient(90deg,transparent,${gold},transparent)`, marginBottom:'40px'}}/>

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{marginBottom:'20px'}}>
              <label style={{
                fontSize:'9px', letterSpacing:'2.5px', textTransform:'uppercase',
                color: focused==='email' ? 'rgba(196,163,90,.6)' : 'rgba(255,255,255,.3)',
                marginBottom:'8px', display:'block', fontWeight:400, transition:'color .3s'
              }}>Email</label>
              <input
                className="sapiora-input"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="tu@empresa.com" required
                style={{
                  width:'100%', background:'rgba(255,255,255,.03)',
                  border:`1px solid ${goldFaint}`, borderRadius:'4px',
                  padding:'12px 16px', fontSize:'13px', color:'#f0ede6',
                  fontFamily:"'DM Sans', sans-serif", letterSpacing:'.3px',
                  boxSizing:'border-box' as any
                }}
              />
            </div>

            {/* Password */}
            <div style={{marginBottom:'8px'}}>
              <label style={{
                fontSize:'9px', letterSpacing:'2.5px', textTransform:'uppercase',
                color: focused==='password' ? 'rgba(196,163,90,.6)' : 'rgba(255,255,255,.3)',
                marginBottom:'8px', display:'block', fontWeight:400, transition:'color .3s'
              }}>Contraseña</label>
              <input
                className="sapiora-input"
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="••••••••" required
                style={{
                  width:'100%', background:'rgba(255,255,255,.03)',
                  border:`1px solid ${goldFaint}`, borderRadius:'4px',
                  padding:'12px 16px', fontSize:'13px', color:'#f0ede6',
                  fontFamily:"'DM Sans', sans-serif", letterSpacing:'.3px',
                  boxSizing:'border-box' as any
                }}
              />
            </div>

            {/* Error */}
            <div style={{fontSize:'11px', color:'#c4735a', marginTop:'12px', textAlign:'center', letterSpacing:'.5px', minHeight:'16px', transition:'opacity .3s', opacity: error ? 1 : 0}}>
              {error || ' '}
            </div>

            {/* Button */}
            <button
              className="sapiora-btn"
              type="submit" disabled={loading}
              style={{
                width:'100%', marginTop:'24px', padding:'14px',
                background:'transparent', border:`1px solid rgba(196,163,90,.4)`,
                borderRadius:'4px', color:gold,
                fontFamily:"'DM Sans', sans-serif", fontSize:'11px',
                letterSpacing:'3px', textTransform:'uppercase', cursor:'pointer',
                opacity: loading ? .6 : 1
              }}
            >
              {loading ? 'Accediendo...' : 'Acceder'}
            </button>
          </form>

          {/* Footer */}
          <div style={{marginTop:'48px', display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={{flex:1, height:'1px', background:'rgba(255,255,255,.06)'}}/>
            <div style={{fontSize:'9px', color:'rgba(255,255,255,.15)', letterSpacing:'1.5px', textTransform:'uppercase'}}>
              Acceso restringido
            </div>
            <div style={{flex:1, height:'1px', background:'rgba(255,255,255,.06)'}}/>
          </div>
        </div>
      </div>
    </>
  )
}