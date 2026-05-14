'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_URL = 'https://owdvtgwuizxzgppqgtps.supabase.co'
const ANON_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZHZ0Z3d1aXp4emdwcHFndHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODU5MDMsImV4cCI6MjA5Mjg2MTkwM30.hpNlm2eUX_zAgYF7Lud9Ru2QSJuHvYaR4EB-Lf9a-4A'
const FONT      = "'Montserrat', -apple-system, sans-serif"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [pwd, setPwd]         = useState('')
  const [pwd2, setPwd2]       = useState('')
  const [show, setShow]       = useState(false)
  const [status, setStatus]   = useState<'idle'|'loading'|'ok'|'err'>('idle')
  const [errMsg, setErrMsg]   = useState('')
  const [token, setToken]     = useState<string|null>(null)
  const [tokenType, setTokenType] = useState<string|null>(null)
  const [checking, setChecking]   = useState(true)

  useEffect(() => {
    // Supabase puts the token in the URL hash: #access_token=...&type=recovery
    // or as query params depending on the email template config
    const hash   = window.location.hash.substring(1)
    const params = new URLSearchParams(hash || window.location.search)
    const t      = params.get('access_token') || params.get('token')
    const type   = params.get('type')

    if (t) {
      setToken(t)
      setTokenType(type)
    }
    setChecking(false)
  }, [])

  async function handleSubmit() {
    if (!pwd || pwd.length < 6) {
      setErrMsg('La contraseña debe tener al menos 6 caracteres')
      setStatus('err')
      return
    }
    if (pwd !== pwd2) {
      setErrMsg('Las contraseñas no coinciden')
      setStatus('err')
      return
    }
    if (!token) {
      setErrMsg('Token inválido o expirado. Solicita un nuevo enlace.')
      setStatus('err')
      return
    }

    setStatus('loading')
    setErrMsg('')

    try {
      // First exchange the token for a session
      const sessionRes = await fetch(`${ADMIN_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      })

      // Use the token directly to update password
      const r = await fetch(`${ADMIN_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: pwd }),
      })

      if (!r.ok) {
        const e = await r.json()
        // If token exchange fails, try recovery flow
        if (e.message?.includes('token') || e.code === 'otp_expired') {
          throw new Error('El enlace ha expirado. Solicita uno nuevo desde la pantalla de login.')
        }
        throw new Error(e.message || 'Error al actualizar la contraseña')
      }

      setStatus('ok')
      setTimeout(() => router.push('/login'), 2500)
    } catch(e: any) {
      setStatus('err')
      setErrMsg(e.message || 'Error desconocido')
    }
  }

  const S = {
    page: {
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
      padding: 24,
    } as any,
    card: {
      background: '#111',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: 16,
      padding: '40px 36px',
      width: '100%',
      maxWidth: 420,
    } as any,
    logo: {
      fontSize: 18,
      fontWeight: 900,
      letterSpacing: 5,
      color: '#f0ede8',
      textAlign: 'center' as const,
      marginBottom: 8,
      fontFamily: FONT,
    },
    logoSpan: { color: '#C4A35A' },
    sub: {
      fontSize: 10,
      letterSpacing: 3,
      color: 'rgba(255,255,255,.25)',
      textAlign: 'center' as const,
      textTransform: 'uppercase' as const,
      marginBottom: 36,
      fontFamily: FONT,
    },
    title: {
      fontSize: 20,
      fontWeight: 800,
      color: '#f0ede8',
      marginBottom: 8,
      letterSpacing: -.3,
      fontFamily: FONT,
    },
    desc: {
      fontSize: 12,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 28,
      lineHeight: 1.7,
      fontFamily: FONT,
    },
    label: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)',
      textTransform: 'uppercase' as const,
      letterSpacing: 2,
      display: 'block',
      marginBottom: 7,
      fontFamily: FONT,
    },
    inputWrap: { position: 'relative' as const, marginBottom: 16 },
    input: {
      width: '100%',
      background: 'rgba(255,255,255,.05)',
      border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 9,
      padding: '12px 42px 12px 14px',
      fontSize: 14,
      color: '#f0ede8',
      fontFamily: FONT,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    eye: {
      position: 'absolute' as const,
      right: 13,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,.3)',
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: FONT,
      padding: 0,
    },
    btn: {
      width: '100%',
      padding: '13px',
      background: '#C4A35A',
      color: '#0a0a0a',
      border: 'none',
      borderRadius: 9,
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
      cursor: 'pointer',
      fontFamily: FONT,
      marginTop: 8,
      transition: 'opacity .2s',
    } as any,
    ok: {
      padding: '14px 16px',
      background: 'rgba(42,138,110,.15)',
      border: '1px solid rgba(42,138,110,.3)',
      borderRadius: 9,
      color: '#4ade80',
      fontSize: 13,
      fontWeight: 600,
      textAlign: 'center' as const,
      fontFamily: FONT,
    },
    err: {
      padding: '14px 16px',
      background: 'rgba(154,60,66,.15)',
      border: '1px solid rgba(154,60,66,.3)',
      borderRadius: 9,
      color: '#f87171',
      fontSize: 12,
      fontWeight: 500,
      fontFamily: FONT,
      marginTop: 14,
    },
    rules: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 6,
      marginBottom: 20,
    },
    rule: (pass: boolean) => ({
      fontSize: 11,
      color: pass ? '#4ade80' : 'rgba(255,255,255,.25)',
      fontFamily: FONT,
      display: 'flex',
      gap: 7,
      alignItems: 'center',
    }),
  }

  const rules = [
    { label: 'Al menos 6 caracteres', pass: pwd.length >= 6 },
    { label: 'Contiene un número',    pass: /\d/.test(pwd) },
    { label: 'Las contraseñas coinciden', pass: pwd.length > 0 && pwd === pwd2 },
  ]

  if (checking) return (
    <div style={S.page}>
      <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 12, fontFamily: FONT, letterSpacing: 2 }}>
        Verificando enlace…
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>SAPIORA<span style={S.logoSpan}>.</span></div>
        <div style={S.sub}>Hotel Lead Intelligence</div>

        {status === 'ok' ? (
          <div style={S.ok}>
            ✓ Contraseña establecida correctamente.<br/>
            <span style={{ fontSize: 11, opacity: .7 }}>Redirigiendo al login…</span>
          </div>
        ) : !token ? (
          <div>
            <div style={{ ...S.err, marginTop: 0 }}>
              Enlace inválido o expirado.<br/>
              <a href="/login" style={{ color: '#C4A35A', fontWeight: 700 }}>Volver al login →</a>
            </div>
          </div>
        ) : (
          <div>
            <div style={S.title}>Establece tu contraseña</div>
            <div style={S.desc}>
              Elige una contraseña segura para acceder a tu pipeline de Sapiora.
            </div>

            <div>
              <label style={S.label}>Nueva contraseña</label>
              <div style={S.inputWrap}>
                <input
                  style={S.input}
                  type={show ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  autoFocus
                />
                <button style={S.eye} onClick={() => setShow(!show)} type="button">
                  {show ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div>
              <label style={S.label}>Confirmar contraseña</label>
              <div style={S.inputWrap}>
                <input
                  style={S.input}
                  type={show ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  value={pwd2}
                  onChange={e => setPwd2(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>

            <div style={S.rules}>
              {rules.map(r => (
                <div key={r.label} style={S.rule(r.pass)}>
                  <span>{r.pass ? '✓' : '○'}</span>
                  {r.label}
                </div>
              ))}
            </div>

            <button
              style={{ ...S.btn, opacity: status === 'loading' ? .6 : 1 }}
              onClick={handleSubmit}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Guardando…' : 'Establecer contraseña →'}
            </button>

            {status === 'err' && errMsg && (
              <div style={S.err}>{errMsg}</div>
            )}

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <a href="/login" style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', fontFamily: FONT, textDecoration: 'none' }}>
                Volver al login
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
