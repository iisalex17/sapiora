'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
  async function getUser() {
    // Check local test session
    const localUser = sessionStorage.getItem('test_user')
    if (localUser) {
      setUser(JSON.parse(localUser))
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    setLoading(false)
  }
  getUser()
}, [])
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{color:'#6b6760',fontFamily:'Montserrat,sans-serif',fontSize:'13px'}}>Cargando...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0d0d0f',color:'#f0eee9',fontFamily:'Montserrat,sans-serif'}}>
      <div style={{background:'#141416',borderBottom:'1px solid rgba(255,255,255,.07)',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:'18px',fontWeight:'700',letterSpacing:'-.3px'}}>Sapiora<span style={{color:'#6b2737'}}>.</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <span style={{fontSize:'12px',color:'#6b6760'}}>{user?.email}</span>
          <button onClick={handleLogout} style={{background:'none',border:'1px solid rgba(255,255,255,.12)',color:'#6b6760',padding:'6px 14px',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'Montserrat,sans-serif'}}>Salir</button>
        </div>
      </div>
      <div style={{padding:'32px'}}>
        <h1 style={{fontSize:'24px',fontWeight:'700',marginBottom:'8px',letterSpacing:'-.5px'}}>Dashboard</h1>
        <p style={{color:'#6b6760',fontSize:'13px',marginBottom:'32px'}}>Bienvenido, {user?.email}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:'16px'}}>
          {[
            {label:'Pipeline de leads',desc:'Ver y gestionar oportunidades',icon:'🗺'},
            {label:'Asset Manager',desc:'Contactos y seguimiento',icon:'📋'},
            {label:'RevPAR Calculator',desc:'Análisis financiero',icon:'📊'},
            {label:'Analytics',desc:'Métricas del pipeline',icon:'📈'},
          ].map((card) => (
            <div key={card.label} style={{background:'#141416',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'24px',cursor:'pointer'}}>
              <div style={{fontSize:'28px',marginBottom:'12px'}}>{card.icon}</div>
              <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'6px'}}>{card.label}</div>
              <div style={{fontSize:'12px',color:'#6b6760'}}>{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}