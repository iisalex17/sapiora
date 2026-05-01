'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [allowed, setAllowed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const s = sessionStorage.getItem('sapiora_session')
    if (!s) { router.push('/login'); return }
    const session = JSON.parse(s)
    // Only Sapiora admin can access
    if (session.email !== 'alex@sapiora.es') {
      router.push('/dashboard/pipeline')
      return
    }
    setAllowed(true)
  }, [])

  if (!allowed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{color:'#6b6760',fontFamily:'Montserrat,sans-serif',fontSize:'13px'}}>Verificando acceso...</div>
    </div>
  )

  return (
    <iframe
      src="/static/admin.html"
      style={{ width:'100%', height:'100vh', border:'none', display:'block' }}
      title="Admin Panel"
    />
  )
}