'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PipelinePage() {
  const [session, setSession] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const s = sessionStorage.getItem('sapiora_session')
    if (!s) { router.push('/login'); return }
    setSession(JSON.parse(s))
  }, [])

  if (!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{color:'#6b6760',fontFamily:'Montserrat,sans-serif',fontSize:'13px'}}>Cargando...</div>
    </div>
  )

  const params = new URLSearchParams({
    url: session.supabase_url,
    key: session.supabase_key,
    org: session.org_id,
    org_name: session.org_name
  })

  return (
    <iframe
      src={`/static/pipeline.html?${params.toString()}`}
      style={{ width:'100%', height:'100vh', border:'none', display:'block' }}
      title="Pipeline"
    />
  )
}