'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      const local = sessionStorage.getItem('test_user')
      if (!user && !local) {
        router.push('/login')
        return
      }
      router.push('/dashboard/pipeline')
    }
    check()
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{color:'#6b6760',fontFamily:'Montserrat,sans-serif',fontSize:'13px'}}>Cargando...</div>
    </div>
  )
}