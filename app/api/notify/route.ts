import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.eu',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, to, leads, org_name } = body

    if (!to) return NextResponse.json({ error: 'No recipient' }, { status: 400 })

    let subject = ''
    let html = ''

    if (type === 'new_leads') {
      const count = leads?.length || 0
      subject = `🏨 ${count} nuevo${count !== 1 ? 's' : ''} lead${count !== 1 ? 's' : ''} en ${org_name || 'Sapiora'}`
      html = buildNewLeadsEmail(leads || [], org_name || 'Sapiora')
    } else if (type === 'weekly_summary') {
      subject = `📊 Resumen semanal — ${org_name || 'Sapiora'}`
      html = buildSummaryEmail(leads || [], org_name || 'Sapiora')
    } else if (type === 'contact_form') {
      const { name, company, email: fromEmail, plan, market, message } = body
      subject = `🏨 Nuevo lead Sapiora — ${company || name}`
      html = buildContactEmail({ name, company, email: fromEmail, plan, market, message })
    } else if (type === 'onboarding') {
      const { user_email, org_name: orgName, reset_link, plan: userPlan } = body
      subject = `Bienvenido a Sapiora — ${orgName || 'Tu plataforma de expansión hotelera'}`
      html = buildOnboardingEmail({ user_email, org_name: orgName, reset_link, plan: userPlan })
    } else {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }

    await transporter.sendMail({
      from: `Sapiora <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Email error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function buildNewLeadsEmail(leads: any[], orgName: string) {
  const hotLeads  = leads.filter(l => l.priority === 'hot')
  const warmLeads = leads.filter(l => l.priority === 'warm')
  const otherLeads = leads.filter(l => l.priority !== 'hot' && l.priority !== 'warm')

  const leadRow = (l: any) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f0ede8;font-size:13px;font-weight:600;color:#0a0a0a">${l.hotel_name || l.name || '—'}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0ede8;font-size:12px;color:#6b6760">${l.City || l.city || '—'}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0ede8;font-size:12px;color:#6b6760">${l.rooms || '—'} hab.</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0ede8">
        <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:${l.priority === 'hot' ? 'rgba(154,60,66,.12)' : l.priority === 'warm' ? 'rgba(181,98,26,.12)' : 'rgba(47,74,122,.12)'};color:${l.priority === 'hot' ? '#9a3c42' : l.priority === 'warm' ? '#b5621a' : '#2f4a7a'}">${l.priority || 'new'}</span>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet"/></head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:'Montserrat',sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    
    <!-- HEADER -->
    <div style="background:#0a0a0a;padding:28px 32px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff">SAPIORA<span style="color:#C4A35A">.</span></div>
        <div style="font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px;text-transform:uppercase;margin-top:4px">Hotel Lead Intelligence</div>
      </div>
      <div style="background:rgba(196,163,90,.15);border:1px solid rgba(196,163,90,.3);border-radius:8px;padding:8px 14px;text-align:right">
        <div style="font-size:20px;font-weight:900;color:#C4A35A;letter-spacing:-0.5px">${leads.length}</div>
        <div style="font-size:8px;color:rgba(255,255,255,.4);letter-spacing:1.5px;text-transform:uppercase">nuevos leads</div>
      </div>
    </div>
    
    <!-- GOLD BAR -->
    <div style="height:2px;background:linear-gradient(90deg,#C4A35A,#A8873E,transparent)"></div>
    
    <!-- BODY -->
    <div style="padding:32px">
      <div style="font-size:18px;font-weight:800;color:#0a0a0a;margin-bottom:6px;letter-spacing:-.3px">Nuevos leads detectados</div>
      <div style="font-size:13px;color:#6b6760;margin-bottom:28px">Se han añadido ${leads.length} nuevo${leads.length !== 1 ? 's' : ''} activo${leads.length !== 1 ? 's' : ''} a tu pipeline de <strong>${orgName}</strong>.</div>

      ${hotLeads.length > 0 ? `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="width:8px;height:8px;border-radius:50%;background:#9a3c42;flex-shrink:0"></div>
        <div style="font-size:10px;font-weight:700;color:#9a3c42;letter-spacing:1.5px;text-transform:uppercase">Hot — Acción inmediata</div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f0ede8;border-radius:10px;overflow:hidden;margin-bottom:20px">
        ${hotLeads.map(leadRow).join('')}
      </table>` : ''}

      ${warmLeads.length > 0 ? `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="width:8px;height:8px;border-radius:50%;background:#b5621a;flex-shrink:0"></div>
        <div style="font-size:10px;font-weight:700;color:#b5621a;letter-spacing:1.5px;text-transform:uppercase">Warm — Preparar outreach</div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f0ede8;border-radius:10px;overflow:hidden;margin-bottom:20px">
        ${warmLeads.map(leadRow).join('')}
      </table>` : ''}

      ${otherLeads.length > 0 ? `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="width:8px;height:8px;border-radius:50%;background:#2f4a7a;flex-shrink:0"></div>
        <div style="font-size:10px;font-weight:700;color:#2f4a7a;letter-spacing:1.5px;text-transform:uppercase">Cold / Nuevos</div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f0ede8;border-radius:10px;overflow:hidden;margin-bottom:20px">
        ${otherLeads.map(leadRow).join('')}
      </table>` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin-top:28px">
        <a href="https://sapiora.site/dashboard/pipeline" style="display:inline-block;background:#C4A35A;color:#0a0a0a;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">Ver pipeline completo →</a>
      </div>
    </div>
    
    <!-- FOOTER -->
    <div style="background:#f8f6f2;padding:20px 32px;border-top:1px solid #e8e4de;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:10px;color:#aaa;letter-spacing:.5px">Sapiora · Hotel Lead Intelligence</div>
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#C4A35A">SAPIORA.</div>
    </div>
  </div>
</body>
</html>`
}

function buildSummaryEmail(leads: any[], orgName: string) {
  const hot  = leads.filter(l => l.priority === 'hot').length
  const warm = leads.filter(l => l.priority === 'warm').length
  const scored = leads.filter(l => l.ai_score != null).length
  const avgScore = scored > 0 ? Math.round(leads.filter(l => l.ai_score != null).reduce((s: number, l: any) => s + l.ai_score, 0) / scored) : 0

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet"/></head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:'Montserrat',sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#0a0a0a;padding:28px 32px">
      <div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff">SAPIORA<span style="color:#C4A35A">.</span></div>
      <div style="font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px;text-transform:uppercase;margin-top:4px">Resumen semanal</div>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,#C4A35A,#A8873E,transparent)"></div>
    <div style="padding:32px">
      <div style="font-size:18px;font-weight:800;color:#0a0a0a;margin-bottom:24px">Tu pipeline esta semana</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px">
        ${[
          { l: 'Total leads', v: leads.length, c: '#C4A35A' },
          { l: 'Hot', v: hot, c: '#9a3c42' },
          { l: 'Warm', v: warm, c: '#b5621a' },
          { l: 'AI Score medio', v: scored > 0 ? avgScore : '—', c: '#2a8a6e' },
        ].map(s => `<div style="background:#f8f6f2;border-radius:10px;padding:16px 20px"><div style="font-size:26px;font-weight:900;color:${s.c};letter-spacing:-1px;line-height:1">${s.v}</div><div style="font-size:9px;color:#6b6760;text-transform:uppercase;letter-spacing:1.5px;margin-top:5px;font-weight:700">${s.l}</div></div>`).join('')}
      </div>
      <div style="text-align:center">
        <a href="https://sapiora.site/dashboard/pipeline" style="display:inline-block;background:#C4A35A;color:#0a0a0a;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">Abrir pipeline →</a>
      </div>
    </div>
    <div style="background:#f8f6f2;padding:20px 32px;border-top:1px solid #e8e4de">
      <div style="font-size:10px;color:#aaa">Sapiora · Hotel Lead Intelligence · sapiora.site</div>
    </div>
  </div>
</body>
</html>`
}

function buildContactEmail({ name, company, email, plan, market, message }: any) {
  const planLabels: Record<string, string> = { pro: 'Pro — 249€/mes', business: 'Business — 549€/mes', enterprise: 'Enterprise — Custom' }
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:'Montserrat',sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#0a0a0a;padding:28px 32px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff">SAPIORA<span style="color:#C4A35A">.</span></div>
        <div style="font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px;text-transform:uppercase;margin-top:4px">Nuevo contacto</div>
      </div>
      <div style="background:rgba(196,163,90,.15);border:1px solid rgba(196,163,90,.3);border-radius:8px;padding:8px 14px">
        <div style="font-size:9px;color:rgba(255,255,255,.4);letter-spacing:1.5px;text-transform:uppercase">Plan</div>
        <div style="font-size:13px;font-weight:700;color:#C4A35A;margin-top:2px">${planLabels[plan] || plan}</div>
      </div>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,#C4A35A,#A8873E,transparent)"></div>
    <div style="padding:32px">
      <div style="font-size:18px;font-weight:800;color:#0a0a0a;margin-bottom:24px;letter-spacing:-.3px">Nueva solicitud de Early Access</div>
      ${[
        { label: 'Nombre', value: name },
        { label: 'Empresa', value: company },
        { label: 'Email', value: email },
        { label: 'Mercado objetivo', value: market },
      ].filter(f => f.value).map(f => `
      <div style="margin-bottom:16px">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b6760;margin-bottom:5px">${f.label}</div>
        <div style="font-size:14px;font-weight:600;color:#0a0a0a">${f.value}</div>
      </div>`).join('')}
      ${message ? `
      <div style="margin-bottom:16px;padding:16px 20px;background:#f8f6f2;border-radius:10px;border-left:3px solid #C4A35A">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b6760;margin-bottom:8px">Mensaje</div>
        <div style="font-size:13px;color:#0a0a0a;line-height:1.7">${message}</div>
      </div>` : ''}
      <div style="text-align:center;margin-top:24px">
        <a href="mailto:${email}" style="display:inline-block;background:#C4A35A;color:#0a0a0a;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">Responder →</a>
      </div>
    </div>
    <div style="background:#f8f6f2;padding:20px 32px;border-top:1px solid #e8e4de;display:flex;justify-content:space-between">
      <div style="font-size:10px;color:#aaa">Sapiora · sapiora.site</div>
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#C4A35A">SAPIORA.</div>
    </div>
  </div>
</body>
</html>`
}

function buildOnboardingEmail({ user_email, org_name, reset_link, plan }: any) {
  const planLabels: Record<string, string> = {
    starter: 'Starter', growth: 'Growth', professional: 'Professional',
    custom: 'Custom', enterprise: 'Enterprise', pro: 'Pro'
  }
  const planLabel = planLabels[plan] || plan || 'Professional'
  const loginUrl = 'https://sapiora.site/login'
  const resetUrl = reset_link || loginUrl

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#F3F1ED;font-family:'Montserrat',sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

    <!-- HEADER -->
    <div style="background:#0A0A0A;padding:32px;text-align:center">
      <div style="font-size:22px;font-weight:900;letter-spacing:5px;color:#fff">SAPIORA<span style="color:#C4A35A">.</span></div>
      <div style="font-size:9px;color:rgba(255,255,255,.3);letter-spacing:3px;text-transform:uppercase;margin-top:6px">Hotel Lead Intelligence</div>
    </div>

    <!-- GOLD BAR -->
    <div style="height:2px;background:linear-gradient(90deg,#C4A35A,#A8873E,transparent)"></div>

    <!-- BODY -->
    <div style="padding:40px 36px">
      <div style="font-size:13px;font-weight:600;color:#C4A35A;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px">Bienvenido</div>
      <h1 style="font-size:26px;font-weight:800;color:#0A0A0A;margin:0 0 14px;letter-spacing:-.5px;line-height:1.2">
        Tu pipeline de expansión hotelera está listo.
      </h1>
      <p style="font-size:14px;font-weight:300;color:#6b6760;line-height:1.8;margin:0 0 28px">
        Hola, tu cuenta en Sapiora ha sido creada para <strong style="color:#0A0A0A;font-weight:600">${org_name || 'tu organización'}</strong>
        con el plan <strong style="color:#0A0A0A;font-weight:600">${planLabel}</strong>.<br/><br/>
        Sapiora automatiza la búsqueda, análisis y gestión de oportunidades de adquisición hotelera.
        Cada semana encontrarás nuevos hoteles analizados con IA directamente en tu pipeline.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0">
        <a href="${resetUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:16px 36px;border-radius:10px;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase">
          Establecer mi contraseña →
        </a>
        <div style="margin-top:12px;font-size:11px;color:#aaa">El enlace expira en 24 horas</div>
      </div>

      <!-- DIVIDER -->
      <div style="border-top:1px solid #E4E2DC;margin:28px 0"></div>

      <!-- WHAT TO EXPECT -->
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b6760;margin-bottom:16px">Qué encontrarás</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${[
          ['🗺', 'Pipeline visual', 'Mapa interactivo y kanban con todos tus leads geocodificados.'],
          ['🤖', 'AI Scoring', 'Score 0-100 por cada activo con análisis ejecutivo y acción recomendada.'],
          ['👤', 'Owner Search', 'Identifica al propietario real con LinkedIn, folio catastral y mensaje de outreach.'],
          ['🔗', 'CRM integrado', 'Sincroniza contactos y deals en HubSpot, Pipedrive, Salesforce o Zoho con un click.'],
        ].map(([icon, title, desc]) =>
          '<div style="display:flex;gap:14px;align-items:flex-start">' +
          '<div style="font-size:20px;flex-shrink:0;margin-top:2px">' + icon + '</div>' +
          '<div>' +
          '<div style="font-size:13px;font-weight:600;color:#0A0A0A;margin-bottom:3px">' + title + '</div>' +
          '<div style="font-size:12px;font-weight:300;color:#6b6760;line-height:1.6">' + desc + '</div>' +
          '</div></div>'
        ).join('')}
      </div>

      <!-- DIVIDER -->
      <div style="border-top:1px solid #E4E2DC;margin:28px 0"></div>

      <!-- LOGIN INFO -->
      <div style="background:#F3F1ED;border-radius:10px;padding:18px 20px">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b6760;margin-bottom:10px">Tus datos de acceso</div>
        <div style="font-size:13px;color:#0A0A0A;margin-bottom:6px"><strong>Email:</strong> ${user_email}</div>
        <div style="font-size:13px;color:#0A0A0A"><strong>Plataforma:</strong> <a href="${loginUrl}" style="color:#C4A35A;font-weight:600">${loginUrl}</a></div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#F8F6F2;padding:20px 36px;border-top:1px solid #E4E2DC;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:10px;color:#aaa">Sapiora · Hotel Lead Intelligence · sapiora.site</div>
      <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:#C4A35A">SAPIORA.</div>
    </div>
  </div>
</body>
</html>`
}
