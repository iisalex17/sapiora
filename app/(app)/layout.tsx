'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const s = sessionStorage.getItem('sapiora_session')
    if (!s) { router.push('/login'); return }
    try { setSession(JSON.parse(s)) } catch(e) { router.push('/login') }
  }, [])

  function handleLogout() {
    sessionStorage.removeItem('sapiora_session')
    router.push('/login')
  }

  if (!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{color:'#6b6760',fontFamily:'Montserrat,sans-serif',fontSize:'13px'}}>Cargando...</div>
    </div>
  )

  // Pipeline has its own full-screen header
  const isPipeline = pathname === '/dashboard/pipeline'
  if (isPipeline) return <>{children}</>

  // Admin = alex@sapiora.es regardless of org
  const isSapioraAdmin = session.email === 'alex@sapiora.es'

  const navItems = [
    { label: 'Pipeline',  href: '/dashboard/pipeline', icon: '🗺' },
    ...(isSapioraAdmin ? [{ label: 'Admin', href: '/admin', icon: '⚙️' }] : []),
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#000'}}>
      {/* NAV */}
      <div style={{
        background:'#0a0a0a', borderBottom:'1px solid rgba(255,255,255,.07)',
        padding:'0 24px', display:'flex', alignItems:'center',
        justifyContent:'space-between', height:'48px', flexShrink:0, zIndex:100
      }}>
        <div style={{display:'flex',alignItems:'center',gap:'24px'}}>
          <div
            style={{fontSize:'16px',fontWeight:'700',color:'#f0eee9',fontFamily:'Montserrat,sans-serif',letterSpacing:'-.3px',cursor:'pointer'}}
            onClick={() => router.push('/dashboard/pipeline')}
          >
            Sapiora<span style={{color:'#C4A35A'}}>.</span>
          </div>
          <div style={{display:'flex',gap:'4px'}}>
            {navItems.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)} style={{
                background: pathname.startsWith(item.href) ? 'rgba(255,255,255,.08)' : 'none',
                border: 'none', color: pathname.startsWith(item.href) ? '#f0eee9' : '#6b6760',
                padding:'6px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:'600',
                cursor:'pointer', fontFamily:'Montserrat,sans-serif',
                display:'flex', alignItems:'center', gap:'6px', transition:'all .15s'
              }}>
                <span style={{fontSize:'13px'}}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          {/* Plan badge */}
          <div style={{
            padding:'3px 10px', borderRadius:20,
            background: session.plan === 'business' ? 'rgba(196,163,90,.15)' : 'rgba(255,255,255,.06)',
            border: `1px solid ${session.plan === 'business' ? 'rgba(196,163,90,.3)' : 'rgba(255,255,255,.1)'}`,
            fontSize:'9px', fontWeight:'700', letterSpacing:1.5,
            color: session.plan === 'business' ? '#C4A35A' : '#6b6760',
            textTransform:'uppercase' as const, fontFamily:'Montserrat,sans-serif'
          }}>
            {session.plan || 'starter'}
          </div>

          {/* User */}
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{
              width:'26px', height:'26px', borderRadius:'50%', background:'#C4A35A',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'11px', fontWeight:'700', color:'#0a0a0a', fontFamily:'Montserrat,sans-serif'
            }}>
              {session.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:'11px',color:'#f0eee9',fontFamily:'Montserrat,sans-serif',fontWeight:'600'}}>
                {session.name || 'Sapiora'}
              </div>
              <div style={{fontSize:'10px',color:'#6b6760',fontFamily:'Montserrat,sans-serif'}}>
                {session.email}
              </div>
            </div>
          </div>

          <button onClick={handleLogout} style={{
            background:'none', border:'1px solid rgba(255,255,255,.1)',
            color:'#6b6760', padding:'5px 12px', borderRadius:'6px',
            fontSize:'11px', cursor:'pointer', fontFamily:'Montserrat,sans-serif',
            transition:'all .15s'
          }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{flex:1,overflow:'hidden'}}>
        {children}
      </div>
    </div>
  )
}