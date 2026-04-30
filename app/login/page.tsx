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
  const [debug, setDebug] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setDebug('')

    try {
      setDebug('Buscando organización...')
      
      const routingRes = await fetch(
        `${ADMIN_URL}/rest/v1/user_routing?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: {
          apikey: ADMIN_KEY,
          Authorization: `Bearer ${ADMIN_KEY}`
        }}
      )
      const routing = await routingRes.json()
      setDebug('Routing: ' + JSON.stringify(routing))

      if (!routing || routing.length === 0) {
        setError('Usuario no encontrado.')
        setLoading(false)
        return
      }

      const { org_id, org_name, supabase_url, supabase_key } = routing[0]
      setDebug('Conectando a: ' + supabase_url)

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
      setDebug('Login status: ' + loginRes.status + ' ' + JSON.stringify(loginData).slice(0,100))

      if (!loginRes.ok || loginData.error) {
        setError('Credenciales incorrectas.')
        setLoading(false)
        return
      }

      sessionStorage.setItem('sapiora_session', JSON.stringify({
        access_token: loginData.access_token,
        email,
        org_id,
        org_name,
        supabase_url,
        supabase_key
      }))

      router.push('/dashboard/pipeline')

    } catch (err: any) {
      setError('Error: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{background:'#141416',border:'1px solid rgba(255,255,255,.1)',borderRadius:'16px',padding:'44px 40px',width:'100%',maxWidth:'420px'}}>
        <div style={{fontSize:'24px',fontWeight:'700',color:'#f0eee9',marginBottom:'4px',letterSpacing:'-.5px',fontFamily:'Montserrat,sans-serif'}}>
          Sapiora<span style={{color:'#6b2737'}}>.</span>
        </div>
        <div style={{fontSize:'11px',color:'#6b6760',marginBottom:'32px',letterSpacing:'.3px'}}>
          Acceso restringido
        </div>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'14px'}}>
            <label style={{fontSize:'10px',fontWeight:'600',color:'#6b6760',textTransform:'uppercase',letterSpacing:'.8px',display:'block',marginBottom:'6px'}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@empresa.com" required
              style={{width:'100%',background:'#1a1a1e',border:'1px solid rgba(255,255,255,.12)',borderRadius:'8px',padding:'10px 13px',fontSize:'13px',color:'#f0eee9',outline:'none',fontFamily:'Montserrat,sans-serif',boxSizing:'border-box' as any}}/>
          </div>
          <div style={{marginBottom:'14px'}}>
            <label style={{fontSize:'10px',fontWeight:'600',color:'#6b6760',textTransform:'uppercase',letterSpacing:'.8px',display:'block',marginBottom:'6px'}}>Contraseña</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required
              style={{width:'100%',background:'#1a1a1e',border:'1px solid rgba(255,255,255,.12)',borderRadius:'8px',padding:'10px 13px',fontSize:'13px',color:'#f0eee9',outline:'none',fontFamily:'Montserrat,sans-serif',boxSizing:'border-box' as any}}/>
          </div>
          {error && <div style={{fontSize:'11px',color:'#c94040',marginBottom:'12px',textAlign:'center'}}>{error}</div>}
          {debug && <div style={{fontSize:'10px',color:'#6b6760',marginBottom:'12px',wordBreak:'break-all',background:'#0a0a0a',padding:'8px',borderRadius:'6px'}}>{debug}</div>}
          <button type="submit" disabled={loading}
            style={{width:'100%',background:'#6b2737',color:'#fff',border:'none',padding:'12px',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer',marginTop:'6px',fontFamily:'Montserrat,sans-serif',letterSpacing:'.3px',opacity:loading?0.6:1}}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}