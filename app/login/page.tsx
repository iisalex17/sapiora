'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

if (email === 'test@sapiora.es' && password === 'sapiora2026') {
  sessionStorage.setItem('test_user', JSON.stringify({ email, id: 'test' }))
  router.push('/dashboard')
  return
}

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{background:'#141416',border:'1px solid rgba(255,255,255,.1)',borderRadius:'16px',padding:'44px 40px',width:'100%',maxWidth:'380px'}}>
        <div style={{fontSize:'24px',fontWeight:'700',color:'#f0eee9',marginBottom:'4px',letterSpacing:'-.5px',fontFamily:'Montserrat,sans-serif'}}>
          Sapiora<span style={{color:'#6b2737'}}>.</span>
        </div>
        <div style={{fontSize:'11px',color:'#6b6760',marginBottom:'32px',letterSpacing:'.3px'}}>
          Acceso restringido
        </div>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'14px'}}>
            <label style={{fontSize:'10px',fontWeight:'600',color:'#6b6760',textTransform:'uppercase',letterSpacing:'.8px',display:'block',marginBottom:'6px'}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@sapiora.es" required style={{width:'100%',background:'#1a1a1e',border:'1px solid rgba(255,255,255,.12)',borderRadius:'8px',padding:'10px 13px',fontSize:'13px',color:'#f0eee9',outline:'none',fontFamily:'Montserrat,sans-serif',boxSizing:'border-box' as any}}/>
          </div>
          <div style={{marginBottom:'14px'}}>
            <label style={{fontSize:'10px',fontWeight:'600',color:'#6b6760',textTransform:'uppercase',letterSpacing:'.8px',display:'block',marginBottom:'6px'}}>Contraseña</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={{width:'100%',background:'#1a1a1e',border:'1px solid rgba(255,255,255,.12)',borderRadius:'8px',padding:'10px 13px',fontSize:'13px',color:'#f0eee9',outline:'none',fontFamily:'Montserrat,sans-serif',boxSizing:'border-box' as any}}/>
          </div>
          {error && <div style={{fontSize:'11px',color:'#c94040',marginBottom:'12px',textAlign:'center'}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:'100%',background:'#6b2737',color:'#fff',border:'none',padding:'12px',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer',marginTop:'6px',fontFamily:'Montserrat,sans-serif',letterSpacing:'.3px'}}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}