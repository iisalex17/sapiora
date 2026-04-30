'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PipelinePage() {
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      // Check Supabase session
      const { data: { user } } = await supabase.auth.getUser()
      // Also allow local test session
      const local = sessionStorage.getItem('test_user')
      if (!user && !local) {
        router.push('/login')
        return
      }
      setChecking(false)
    }
    check()
  }, [])

  if (checking) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{color:'#6b6760',fontFamily:'Montserrat,sans-serif',fontSize:'13px'}}>Cargando...</div>
    </div>
  )

  return (
    <iframe
      src="/api/pipeline"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block'
      }}
      title="Pipeline"
    />
  )
}