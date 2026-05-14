'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type SapioraSession = {
  supabase_url: string
  supabase_key: string
  org_id: string
  org_name?: string
}

export default function PipelinePage() {
  const router = useRouter()

  const [session, setSession] = useState<SapioraSession | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    try {
      const storedSession = sessionStorage.getItem('sapiora_session')

      if (!storedSession) {
        router.push('/login')
        return
      }

      const parsed = JSON.parse(storedSession)

      const supabaseUrl = parsed.supabase_url || parsed.url
      const supabaseKey = parsed.supabase_key || parsed.key
      const orgId = parsed.org_id || parsed.org
      const orgName = parsed.org_name || ''

      if (!supabaseUrl || !supabaseKey || !orgId) {
        console.error('Sesión incompleta:', parsed)
        setError('Sesión incompleta. Vuelve a iniciar sesión.')
        return
      }

      setSession({
        supabase_url: supabaseUrl,
        supabase_key: supabaseKey,
        org_id: orgId,
        org_name: orgName
      })
    } catch (err) {
      console.error('Error leyendo sapiora_session:', err)
      setError('Sesión inválida. Vuelve a iniciar sesión.')
    }
  }, [router])

  const iframeSrc = useMemo(() => {
    if (!session) return ''

    const params = new URLSearchParams()

    params.set('url', session.supabase_url)
    params.set('key', session.supabase_key)
    params.set('org', session.org_id)
    params.set('org_id', session.org_id)
    params.set('org_name', session.org_name || '')

    return `/static/pipeline.html?${params.toString()}`
  }, [session])

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#000',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Montserrat, sans-serif',
          padding: 24,
          textAlign: 'center'
        }}
      >
        <div>
          <div style={{ marginBottom: 16 }}>{error}</div>

          <button
            onClick={() => router.push('/login')}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  if (!session || !iframeSrc) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000'
        }}
      >
        <div
          style={{
            color: '#6b6760',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 13
          }}
        >
          Cargando...
        </div>
      </div>
    )
  }

  return (
    <iframe
      src={iframeSrc}
      title="Pipeline"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
        background: '#000'
      }}
      onLoad={() => {
        console.log('Pipeline iframe cargado:', iframeSrc)
      }}
    />
  )
}