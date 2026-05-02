'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_KEY!

export default function AdminPage() {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const s = sessionStorage.getItem('sapiora_session')
    if (!s) { router.push('/login'); return }
    const session = JSON.parse(s)
    if (session.email !== 'alex@sapiora.es') {
      router.push('/dashboard/pipeline')
      return
    }
    const params = new URLSearchParams({
      url: ADMIN_URL,
      key: ADMIN_KEY,
      email: session.email,
    })
    setIframeSrc(`/static/admin.html?${params.toString()}`)
  }, [])

  if (!iframeSrc) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{color:'#6b6760',fontFamily:'Montserrat,sans-serif',fontSize:'13px'}}>Verificando acceso...</div>
    </div>
  )

  return (
    <iframe
      src={iframeSrc}
      style={{ width:'100%', height:'100%', border:'none', display:'block' }}
      title="Admin Panel"
    />
  )
}