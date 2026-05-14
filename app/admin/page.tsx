'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_URL = 'https://owdvtgwuizxzgppqgtps.supabase.co'
const ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZHZ0Z3d1aXp4emdwcHFndHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODU5MDMsImV4cCI6MjA5Mjg2MTkwM30.hpNlm2eUX_zAgYF7Lud9Ru2QSJuHvYaR4EB-Lf9a-4A'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZHZ0Z3d1aXp4emdwcHFndHBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4NTkwMywiZXhwIjoyMDkyODYxOTAzfQ.DcRNt6ZrLy6PrE4Nf1SW9v6I1DGx-6dTvXmq9PkCl80'
const H = { apikey: ADMIN_KEY, Authorization: `Bearer ${ADMIN_KEY}`, 'Content-Type': 'application/json' }

const PLANS = ['starter','growth','professional','custom']
const PLAN_COLOR: Record<string,string> = { starter:'#6b6760', growth:'#2f4a7a', professional:'#C4A35A', custom:'#2a8a6e' }
const STATUS_COLOR: Record<string,string> = { active:'#2a8a6e', inactive:'#9a3c42', trial:'#b5621a', pending:'#2f4a7a' }
const DEFAULT_CFG = { prompt_context:'', target_market:'', scoring_criteria:'', outreach_language:'es', outreach_context:'', crm:'hubspot', crm_key:'', hubspot_pipeline:'default', hubspot_key:'', pipedrive_domain:'', pipedrive_pipeline:1, salesforce_instance:'', zoho_domain:'zohocrm.com', crm_stage_map:{hot:'qualified',warm:'contact_made',cold:'new',new:'new'}, currency:'USD', revpar_fee_pct:7, revpar_gop_pct:40, map_center:[25.77,-80.19], map_zoom:11, owner_search_regions:['Miami-Dade County','Florida'], col_why_label:'Por qué puede mejorarlo' }

type Org = { id:string; name:string; email:string; plan:string; status:string; phone?:string; country?:string; notes?:string; supabase_url?:string; supabase_key?:string; pipeline_config?:any; org_id?:string; billing_address?:string; billing_nif?:string }
type User = { id:string; email:string; org_id:string; org_name:string; supabase_url:string; supabase_key:string }
type Invoice = { id:string; org_id?:string; client_name:string; concept:string; amount:number; date:string; status:string; created_at:string }

const FONT = "'Montserrat', -apple-system, sans-serif"

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'dashboard'|'clients'|'users'|'invoices'|'pipeline'>('dashboard')
  const [orgs, setOrgs] = useState<Org[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{type:'ok'|'err',text:string}|null>(null)
  const [editOrg, setEditOrg] = useState<any>(null)
  const [showNewOrg, setShowNewOrg] = useState(false)
  const [showNewUser, setShowNewUser] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<Org|null>(null)
  const [newOrg, setNewOrg] = useState({ id:'', name:'', email:'', plan:'pro', status:'trial', phone:'', country:'Spain', notes:'', billing_address:'', billing_nif:'', supabase_url:'', supabase_key:'', pipeline_config:{...DEFAULT_CFG} })
  const [newUser, setNewUser] = useState({ email:'', password:'', org_id:'' })
  const [changePwd, setChangePwd] = useState<{email:string,pwd:string}|null>(null)
  const [invoice, setInvoice] = useState({
    num:`SAP-${new Date().getFullYear()}-001`, date:new Date().toISOString().split('T')[0], due:'',
    from_name:'Sapiora SL', from_nif:'B-XXXXXXXX', from_addr:'Calle X, Barcelona',
    to_name:'', to_nif:'', to_addr:'', to_email:'',
    lines:[{desc:'Suscripción Sapiora — Plan Pro', qty:1, price:299, vat:21}],
    notes:'',
  })

  useEffect(() => {
    const s = sessionStorage.getItem('sapiora_session')
    if (!s) { router.push('/login'); return }
    const sess = JSON.parse(s)
    if (sess.email !== 'alex@sapiora.es') { router.push('/dashboard/pipeline'); return }
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [orgsRes, usersRes, invRes] = await Promise.all([
        fetch(`${ADMIN_URL}/rest/v1/organizations?select=*&order=name`, { headers: H }),
        fetch(`${ADMIN_URL}/rest/v1/user_routing?select=*&order=email`, { headers: H }),
        fetch(`${ADMIN_URL}/rest/v1/invoices?select=*&order=created_at.desc`, { headers: H }).catch(() => ({ json: () => [] } as any)),
      ])
      const od = await orgsRes.json(); const ud = await usersRes.json(); const id = await invRes.json()
      setOrgs(Array.isArray(od) ? od : [])
      setUsers(Array.isArray(ud) ? ud : [])
      setInvoices(Array.isArray(id) ? id : [])
    } catch(e) { showMsg('err','Error cargando datos') }
    setLoading(false)
  }

  function showMsg(type:'ok'|'err', text:string) { setMsg({type,text}); setTimeout(()=>setMsg(null),4500) }

  async function createOrg() {
    if (!newOrg.id||!newOrg.name||!newOrg.email) { showMsg('err','ID, nombre y email son obligatorios'); return }
    setSaving(true)
    try {
      const r = await fetch(`${ADMIN_URL}/rest/v1/organizations`, {
        method:'POST', headers:{...H,Prefer:'return=representation'},
        body:JSON.stringify({ id:newOrg.id, name:newOrg.name, email:newOrg.email, plan:newOrg.plan, status:newOrg.status, phone:newOrg.phone||null, country:newOrg.country||null, notes:newOrg.notes||null, billing_address:newOrg.billing_address||null, billing_nif:newOrg.billing_nif||null, supabase_url:newOrg.supabase_url||null, supabase_key:newOrg.supabase_key||null, pipeline_config:newOrg.pipeline_config })
      })
      if (!r.ok) { const e=await r.json(); throw new Error(e.message||'HTTP '+r.status) }
      showMsg('ok',`✓ "${newOrg.name}" creado`)
      setShowNewOrg(false)
      setNewOrg({ id:'', name:'', email:'', plan:'pro', status:'trial', phone:'', country:'Spain', notes:'', billing_address:'', billing_nif:'', supabase_url:'', supabase_key:'', pipeline_config:{...DEFAULT_CFG} })
      loadAll()
    } catch(e:any) { showMsg('err',e.message) }
    setSaving(false)
  }

  async function updateOrg() {
    if (!editOrg) return
    setSaving(true)
    try {
      let cfg = editOrg.pipeline_config
      if (typeof cfg==='string') { try { cfg=JSON.parse(cfg) } catch(e) { throw new Error('Pipeline config no es JSON válido') } }
      const r = await fetch(`${ADMIN_URL}/rest/v1/organizations?id=eq.${editOrg.id}`, {
        method:'PATCH', headers:{...H,Prefer:'return=minimal'},
        body:JSON.stringify({ name:editOrg.name, email:editOrg.email, plan:editOrg.plan, status:editOrg.status, phone:editOrg.phone||null, country:editOrg.country||null, notes:editOrg.notes||null, billing_address:editOrg.billing_address||null, billing_nif:editOrg.billing_nif||null, supabase_url:editOrg.supabase_url||null, supabase_key:editOrg.supabase_key||null, pipeline_config:cfg })
      })
      if (!r.ok) throw new Error('HTTP '+r.status)
      showMsg('ok',`✓ "${editOrg.name}" actualizado`)
      setEditOrg(null); loadAll()
    } catch(e:any) { showMsg('err',e.message) }
    setSaving(false)
  }

  async function toggleOrgStatus(org:Org) {
    const s = org.status==='active'?'inactive':'active'
    await fetch(`${ADMIN_URL}/rest/v1/organizations?id=eq.${org.id}`,{method:'PATCH',headers:H,body:JSON.stringify({status:s})})
    showMsg('ok',`${org.name} → ${s}`); loadAll()
  }

  async function deleteOrg(id:string, name:string) {
    if (!confirm(`¿Eliminar "${name}" y todos sus usuarios?`)) return
    await fetch(`${ADMIN_URL}/rest/v1/user_routing?org_id=eq.${id}`,{method:'DELETE',headers:H})
    await fetch(`${ADMIN_URL}/rest/v1/organizations?id=eq.${id}`,{method:'DELETE',headers:H})
    showMsg('ok','Cliente eliminado'); loadAll()
  }

  async function createUser() {
    if (!newUser.email||!newUser.org_id||!newUser.password) { showMsg('err','Email, organización y contraseña son obligatorios'); return }
    const org = orgs.find(o=>o.id===newUser.org_id)
    if (!org) { showMsg('err','Organización no encontrada'); return }
    setSaving(true)
    try {
      const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZHZ0Z3d1aXp4emdwcHFndHBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4NTkwMywiZXhwIjoyMDkyODYxOTAzfQ.DcRNt6ZrLy6PrE4Nf1SW9v6I1DGx-6dTvXmq9PkCl80'
      const authRes = await fetch(`${ADMIN_URL}/auth/v1/admin/users`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`},body:JSON.stringify({email:newUser.email,password:newUser.password,email_confirm:true})})
      if (!authRes.ok) { const e=await authRes.json(); throw new Error(e.msg||e.message||'Error en Auth') }
      const r = await fetch(`${ADMIN_URL}/rest/v1/user_routing`,{method:'POST',headers:{...H,Prefer:'return=representation'},body:JSON.stringify({email:newUser.email,org_id:org.org_id||org.id,org_name:org.name,supabase_url:org.supabase_url,supabase_key:org.supabase_key})})
      if (!r.ok) { const e=await r.json(); throw new Error(e.message||'HTTP '+r.status) }
      showMsg('ok',`✓ Usuario "${newUser.email}" creado`)
      // Send onboarding email
      try {
        console.log('Generating reset link for', newUser.email)
        const resetRes = await fetch(`${ADMIN_URL}/auth/v1/admin/generate_link`, {
          method:'POST',
          headers:{'Content-Type':'application/json', apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`},
          body:JSON.stringify({ type:'recovery', email:newUser.email, options: { redirect_to: 'https://sapiora.site/reset-password' } })
        })
        const resetData = await resetRes.json()
        console.log('generate_link response:', resetData)
        const resetLink = resetData?.properties?.action_link || resetData?.action_link || null
        console.log('reset link:', resetLink)
        const notifyRes = await fetch('/api/notify', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            type:'onboarding',
            to: newUser.email,
            user_email: newUser.email,
            org_name: org?.name || '',
            plan: org?.plan || 'professional',
            reset_link: resetLink,
          })
        })
        const notifyData = await notifyRes.json()
        console.log('notify response:', notifyData)
      } catch(e) { console.error('Onboarding email error:', e) }
      setShowNewUser(false); setNewUser({email:'',password:'',org_id:''}); loadAll()
    } catch(e:any) { showMsg('err',e.message) }
    setSaving(false)
  }

  async function deleteUser(email:string) {
    if (!confirm(`¿Eliminar usuario "${email}"?`)) return
    const SH = {'Content-Type':'application/json', apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`}
    try {
      // 1. Find user in auth.users
      const listRes = await fetch(`${ADMIN_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,{ headers:SH })
      const listData = await listRes.json()
      const userId = listData?.users?.[0]?.id
      // 2. Delete from auth.users
      if (userId) {
        const delRes = await fetch(`${ADMIN_URL}/auth/v1/admin/users/${userId}`,{ method:'DELETE', headers:SH })
        if (!delRes.ok) { const e=await delRes.json(); throw new Error(e.message||'Error deleting from auth') }
      }
      // 3. Delete from user_routing
      await fetch(`${ADMIN_URL}/rest/v1/user_routing?email=eq.${encodeURIComponent(email)}`,{ method:'DELETE', headers:SH })
      showMsg('ok','Usuario eliminado correctamente')
    } catch(e:any) { showMsg('err', e.message) }
    loadAll()
  }

  async function changePassword(email:string, newPwd:string) {
    if (!newPwd || newPwd.length < 6) { showMsg('err','La contraseña debe tener al menos 6 caracteres'); return }
    setSaving(true)
    try {
      // Get user id first
      const listRes = await fetch(`${ADMIN_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
        headers:{'Content-Type':'application/json', apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`}
      })
      const listData = await listRes.json()
      const userId = listData?.users?.[0]?.id
      if (!userId) throw new Error('Usuario no encontrado en Auth')
      const r = await fetch(`${ADMIN_URL}/auth/v1/admin/users/${userId}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json', apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`},
        body:JSON.stringify({ password: newPwd })
      })
      if (!r.ok) { const e=await r.json(); throw new Error(e.message||'HTTP '+r.status) }
      showMsg('ok',`✓ Contraseña de ${email} actualizada`)
      setChangePwd(null)
    } catch(e:any) { showMsg('err',e.message) }
    setSaving(false)
  }

  async function resetPassword(email:string) {
    try {
      const r = await fetch(`${ADMIN_URL}/auth/v1/recover`,{method:'POST',headers:H,body:JSON.stringify({email})})
      if (r.ok) showMsg('ok',`Email de reset enviado a ${email}`)
      else showMsg('err','Error enviando reset')
    } catch(e) { showMsg('err','Error de conexión') }
  }

  async function saveInvoice(status:string) {
    const sub = invoice.lines.reduce((s,l)=>s+l.qty*l.price,0)
    const vat = invoice.lines.reduce((s,l)=>s+l.qty*l.price*l.vat/100,0)
    const total = sub+vat
    const org = orgs.find(o=>o.name===invoice.to_name||o.email===invoice.to_email)
    try {
      const r = await fetch(`${ADMIN_URL}/rest/v1/invoices`,{
        method:'POST', headers:{...H,Prefer:'return=representation'},
        body:JSON.stringify({
          client_name: invoice.to_name || '—',
          concept: invoice.lines.map(l=>l.desc).join(', ') || invoice.num,
          amount: total,
          date: invoice.date,
          status,
          org_id: org?.org_id || org?.id || null,
        })
      })
      if (!r.ok) { const e=await r.json(); throw new Error(e.message||'HTTP '+r.status) }
      showMsg('ok','✓ Factura guardada')
      loadAll()
    } catch(e:any) { showMsg('err','Error guardando: '+e.message) }
  }

  async function updateInvoiceStatus(id:string, status:string) {
    await fetch(`${ADMIN_URL}/rest/v1/invoices?id=eq.${id}`,{method:'PATCH',headers:H,body:JSON.stringify({status})})
    showMsg('ok',`Factura marcada como ${status}`); loadAll()
  }

  function generateInvoicePDF(inv?: any) {
    const src = inv || invoice
    const lines = src.lines || invoice.lines
    const sub = lines.reduce((s:number,l:any)=>s+l.qty*l.price,0)
    const vat = lines.reduce((s:number,l:any)=>s+l.qty*l.price*l.vat/100,0)
    const total = sub+vat
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--gold:#C4A35A;--gold-d:#A8873E;--black:#0A0A0A;--off:#F7F5F2;--gray:#6B6B6B;--border:#E4E0D8}
body{font-family:'Montserrat',sans-serif;font-size:12px;color:var(--black);background:#fff}
.page{max-width:794px;margin:0 auto;padding:60px 72px;min-height:1120px;position:relative}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0}
.logo{font-size:24px;font-weight:900;letter-spacing:5px;color:var(--black)}
.logo span{color:var(--gold)}
.logo-sub{font-size:8px;letter-spacing:3px;color:var(--gray);text-transform:uppercase;margin-top:6px;font-weight:500}
.inv-meta{text-align:right}
.inv-tag{display:inline-block;background:var(--black);color:rgba(255,255,255,.6);font-size:7px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:4px 10px;border-radius:4px;margin-bottom:8px}
.inv-num{font-size:22px;font-weight:900;letter-spacing:-.5px;color:var(--black)}
.gold-bar{height:2px;background:linear-gradient(90deg,var(--gold),var(--gold-d) 60%,transparent);margin:28px 0 40px;border-radius:2px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:40px}
.p-tag{font-size:7px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--gold-d);margin-bottom:10px}
.p-name{font-size:15px;font-weight:800;color:var(--black);margin-bottom:8px;letter-spacing:-.3px}
.p-info{font-size:11px;color:var(--gray);line-height:1.9;font-weight:400}
.dates{display:flex;margin-bottom:40px;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.dc{flex:1;padding:14px 20px;border-right:1px solid var(--border)}
.dc:last-child{border-right:none}
.dc-l{font-size:7px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--gray);margin-bottom:5px}
.dc-v{font-size:14px;font-weight:700;color:var(--black);letter-spacing:-.3px}
.tbl{border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:32px}
table{width:100%;border-collapse:collapse}
thead tr{background:var(--black)}
th{padding:11px 16px;font-size:7px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.5);text-align:left}
th:not(:first-child){text-align:right}
tbody tr{border-bottom:1px solid var(--border)}
tbody tr:last-child{border-bottom:none}
tbody tr:nth-child(even){background:var(--off)}
td{padding:14px 16px;font-size:12px;font-weight:400;color:var(--black)}
td:not(:first-child){text-align:right;font-weight:600}
.totals{display:flex;justify-content:flex-end;margin-bottom:40px}
.tot-box{width:280px;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.tr{display:flex;justify-content:space-between;padding:11px 18px;border-bottom:1px solid var(--border);font-size:12px}
.tr:last-child{background:var(--black);border-bottom:none;padding:16px 18px}
.tl{color:var(--gray);font-weight:500}
.tv{font-weight:700}
.tr:last-child .tl{color:rgba(255,255,255,.5);font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;display:flex;align-items:center}
.tr:last-child .tv{color:var(--gold);font-size:20px;font-weight:900;letter-spacing:-.5px}
.notes{background:var(--off);border-radius:8px;padding:16px 20px;margin-bottom:40px;border-left:3px solid var(--gold)}
.notes-l{font-size:7px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold-d);margin-bottom:6px}
.notes-t{font-size:11px;color:var(--gray);line-height:1.8}
.footer{position:absolute;bottom:48px;left:72px;right:72px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.fl{font-size:9px;color:var(--gray);line-height:1.7;font-weight:400}
.fr{font-size:10px;font-weight:900;letter-spacing:3px;color:var(--gold-d)}
@media print{@page{margin:0;size:A4}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div><div class="logo">SAPIORA<span>.</span></div><div class="logo-sub">Hotel Lead Intelligence</div></div>
    <div class="inv-meta"><div class="inv-tag">Factura</div><div class="inv-num">${src.num||invoice.num}</div><div style="font-size:11px;color:var(--gray);margin-top:4px;font-weight:500">${src.date||invoice.date}</div></div>
  </div>
  <div class="gold-bar"></div>
  <div class="parties">
    <div><div class="p-tag">Emisor</div><div class="p-name">${src.from_name||invoice.from_name}</div><div class="p-info">NIF/CIF: ${src.from_nif||invoice.from_nif}<br>${src.from_addr||invoice.from_addr}</div></div>
    <div><div class="p-tag">Cliente</div><div class="p-name">${src.to_name||invoice.to_name||'—'}</div><div class="p-info">NIF/CIF: ${src.to_nif||invoice.to_nif||'—'}<br>${src.to_addr||invoice.to_addr||'—'}<br>${src.to_email||invoice.to_email||''}</div></div>
  </div>
  <div class="dates">
    <div class="dc"><div class="dc-l">Fecha emisión</div><div class="dc-v">${src.date||invoice.date}</div></div>
    ${(src.due||invoice.due)?`<div class="dc"><div class="dc-l">Vencimiento</div><div class="dc-v">${src.due||invoice.due}</div></div>`:''}
    <div class="dc"><div class="dc-l">Referencia</div><div class="dc-v">${src.num||invoice.num}</div></div>
  </div>
  <div class="tbl"><table>
    <thead><tr><th>Descripción</th><th>Qty</th><th>Precio unit.</th><th>IVA</th><th>Importe</th></tr></thead>
    <tbody>${lines.map((l:any)=>`<tr><td>${l.desc}</td><td>${l.qty}</td><td>${(+l.price).toFixed(2)} €</td><td>${l.vat}%</td><td>${(l.qty*l.price).toFixed(2)} €</td></tr>`).join('')}</tbody>
  </table></div>
  <div class="totals"><div class="tot-box">
    <div class="tr"><span class="tl">Subtotal</span><span class="tv">${sub.toFixed(2)} €</span></div>
    <div class="tr"><span class="tl">IVA</span><span class="tv">${vat.toFixed(2)} €</span></div>
    <div class="tr"><span class="tl">TOTAL</span><span class="tv">${total.toFixed(2)} €</span></div>
  </div></div>
  ${(src.notes||invoice.notes)?`<div class="notes"><div class="notes-l">Notas y condiciones de pago</div><div class="notes-t">${src.notes||invoice.notes}</div></div>`:''}
  <div class="footer">
    <div class="fl">${src.from_name||invoice.from_name} · NIF ${src.from_nif||invoice.from_nif}<br>${src.from_addr||invoice.from_addr}</div>
    <div class="fr">SAPIORA.</div>
  </div>
</div></body></html>`
    const w = window.open('','_blank')
    if (!w) { showMsg('err','Activa los popups del navegador'); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(()=>w.print(),600)
  }

  // ── STYLES ───────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    body, html { font-family: ${FONT}; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }
    input, select, textarea, button { font-family: ${FONT} !important; }
    input::placeholder { color: rgba(255,255,255,.18) !important; }
    select option { background: #1e1e1e; color: #f0ede8; }
  `

  const S = {
    input: { width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'10px 13px', fontSize:13, color:'#f0ede8', fontFamily:FONT, outline:'none', transition:'border-color .2s' } as any,
    textarea: { width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'10px 13px', fontSize:12, color:'#f0ede8', fontFamily:FONT, outline:'none', minHeight:80, resize:'vertical' as const, lineHeight:1.65 } as any,
    select: { width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'10px 13px', fontSize:13, color:'#f0ede8', fontFamily:FONT, outline:'none', appearance:'none' as const } as any,
    label: { fontSize:9, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase' as const, letterSpacing:2, display:'block', marginBottom:6, fontFamily:FONT } as any,
    field: { marginBottom:16 } as any,
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 } as any,
    grid3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 } as any,
    btn: (c='#C4A35A') => ({ padding:'10px 20px', borderRadius:9, border:'none', background:c, color:c==='#C4A35A'?'#0a0a0a':'#fff', fontSize:11, fontWeight:800, letterSpacing:1, textTransform:'uppercase' as const, cursor:'pointer', fontFamily:FONT, transition:'all .2s' }),
    btnS: { padding:'9px 15px', borderRadius:8, border:'1px solid rgba(255,255,255,.12)', background:'transparent', color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT } as any,
    btnDel: { padding:'8px 12px', borderRadius:7, border:'none', background:'rgba(154,60,66,.15)', color:'#c0535a', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT } as any,
    card: { background:'#111', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'18px 22px', marginBottom:10 } as any,
    modal: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,.8)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(4px)' } as any,
    modalBox: { background:'#111', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:32, width:'100%', maxWidth:660, maxHeight:'92vh', overflow:'auto' } as any,
    modalTitle: { fontSize:17, fontWeight:800, color:'#f0ede8', marginBottom:22, letterSpacing:-.3, fontFamily:FONT } as any,
    badge: (c:string) => ({ display:'inline-block', padding:'3px 9px', borderRadius:20, fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' as const, background:c+'22', color:c, border:`1px solid ${c}44` }),
    msg: (t:string) => ({ padding:'12px 16px', borderRadius:9, fontSize:12, fontWeight:600, marginBottom:18, background:t==='ok'?'rgba(42,138,110,.15)':'rgba(154,60,66,.15)', color:t==='ok'?'#4ade80':'#f87171', border:`1px solid ${t==='ok'?'rgba(42,138,110,.3)':'rgba(154,60,66,.3)'}`, fontFamily:FONT }) as any,
  }

  if (loading) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'rgba(255,255,255,.3)', fontFamily:FONT, letterSpacing:2, textTransform:'uppercase' }}>
        Cargando panel…
      </div>
    </>
  )

  const activeOrgs = orgs.filter(o=>o.status==='active').length
  const totalRevenue = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.amount||0),0)
  const pendingRevenue = invoices.filter(i=>i.status==='pending').reduce((s,i)=>s+(i.amount||0),0)

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:'100vh', background:'#0a0a0a', fontFamily:FONT, color:'#f0ede8', display:'flex', flexDirection:'column' }}>

        {/* TOPBAR */}
        <div style={{ height:52, background:'#0d0d0d', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', padding:'0 28px', gap:20, flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:900, letterSpacing:4, color:'#f0ede8', fontFamily:FONT }}>
            SAPIORA<span style={{color:'#C4A35A'}}>.</span>
          </div>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,.1)' }}/>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.25)', letterSpacing:3, textTransform:'uppercase', fontWeight:600 }}>Admin</div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:FONT }}>alex@sapiora.es</div>
            <button style={S.btnS} onClick={()=>{sessionStorage.removeItem('sapiora_session');router.push('/login')}}>Salir</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1, minHeight:0 }}>

          {/* SIDEBAR */}
          <div style={{ width:196, background:'#0d0d0d', borderRight:'1px solid rgba(255,255,255,.06)', padding:'18px 10px', display:'flex', flexDirection:'column', gap:3 }}>
            {([
              ['dashboard','dashboard','Panel'],
              ['clients','clients','Clientes'],
              ['users','users','Usuarios'],
              ['invoices','invoices','Facturación'],
              ['pipeline','pipeline','Pipelines'],
            ] as const).map(([id,,label]) => {
              const icons: Record<string,string> = { dashboard:'◈', clients:'⬡', users:'◯', invoices:'▣', pipeline:'◉' }
              const on = tab === id
              return (
                <button key={id} onClick={()=>setTab(id)} style={{ padding:'10px 14px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:on?700:400, color:on?'#f0ede8':'rgba(255,255,255,.3)', background:on?'rgba(255,255,255,.07)':'transparent', border:'none', fontFamily:FONT, display:'flex', alignItems:'center', gap:10, letterSpacing:.2, transition:'all .15s', textAlign:'left' }}>
                  <span style={{ fontSize:13, opacity:on?1:.6 }}>{icons[id]}</span>
                  {label}
                  {id==='invoices' && pendingRevenue > 0 && <span style={{ marginLeft:'auto', background:'#b5621a', color:'#fff', fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:10, letterSpacing:.5 }}>€</span>}
                </button>
              )
            })}
            <div style={{ flex:1 }}/>
            <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,.06)', marginTop:8 }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.15)', letterSpacing:1, lineHeight:1.7, fontFamily:FONT }}>
                {orgs.length} clientes<br/>{users.length} usuarios
              </div>
            </div>
          </div>

          {/* MAIN */}
          <div style={{ flex:1, overflow:'auto', padding:32 }}>
            {msg && <div style={S.msg(msg.type)}>{msg.text}</div>}

            {/* ── DASHBOARD ── */}
            {tab==='dashboard' && (
              <div>
                <div style={{ marginBottom:28 }}>
                  <div style={{ fontSize:22, fontWeight:900, letterSpacing:-.5, marginBottom:4, fontFamily:FONT }}>Dashboard</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:FONT }}>Resumen global de Sapiora</div>
                </div>

                {/* Stats */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:32 }}>
                  {[
                    { label:'Clientes totales', val:orgs.length, color:'#C4A35A' },
                    { label:'Activos', val:activeOrgs, color:'#2a8a6e' },
                    { label:'Usuarios', val:users.length, color:'#2f4a7a' },
                    { label:'Ingresos cobrados', val:`${totalRevenue.toFixed(0)} €`, color:'#C4A35A' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#111', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'20px 22px' }}>
                      <div style={{ fontSize:30, fontWeight:900, color:s.color, letterSpacing:-1.5, lineHeight:1, marginBottom:6, fontFamily:FONT }}>{s.val}</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:1.8, fontWeight:700, fontFamily:FONT }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Plan distribution */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
                  <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'22px 24px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:2, textTransform:'uppercase', marginBottom:18, fontFamily:FONT }}>Clientes por plan</div>
                    {PLANS.map(p => {
                      const n = orgs.filter(o=>o.plan===p).length
                      if (!n) return null
                      const pct = Math.round(n/Math.max(orgs.length,1)*100)
                      return (
                        <div key={p} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:PLAN_COLOR[p], flexShrink:0 }}/>
                          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.7)', width:80, fontFamily:FONT, textTransform:'uppercase', letterSpacing:.5 }}>{p}</div>
                          <div style={{ flex:1, height:6, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:pct+'%', height:'100%', background:PLAN_COLOR[p], borderRadius:3 }}/>
                          </div>
                          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.5)', width:24, textAlign:'right', fontFamily:FONT }}>{n}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'22px 24px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:2, textTransform:'uppercase', marginBottom:18, fontFamily:FONT }}>Facturas recientes</div>
                    {invoices.slice(0,4).map(inv => (
                      <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                        <div style={{ flex:1, fontSize:11, color:'rgba(255,255,255,.6)', fontFamily:FONT }}>{inv.client_name||inv.id}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:inv.status==='paid'?'#2a8a6e':inv.status==='pending'?'#C4A35A':'rgba(255,255,255,.3)', fontFamily:FONT }}>{inv.amount?.toFixed(0)} €</div>
                        <span style={S.badge(inv.status==='paid'?'#2a8a6e':inv.status==='pending'?'#b5621a':'#6b6760')}>{inv.status}</span>
                      </div>
                    ))}
                    {!invoices.length && <div style={{ fontSize:11, color:'rgba(255,255,255,.2)', fontFamily:FONT }}>Sin facturas aún</div>}
                  </div>
                </div>

                {/* Recent clients */}
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:12, letterSpacing:-.2, fontFamily:FONT }}>Clientes activos</div>
                {orgs.filter(o=>o.status==='active').slice(0,5).map(org => (
                  <div key={org.id} style={{ ...S.card, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:'rgba(196,163,90,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🏨</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#f0ede8', fontFamily:FONT }}>{org.name}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:2, fontFamily:FONT }}>{org.email} · {org.country}</div>
                    </div>
                    <span style={S.badge(PLAN_COLOR[org.plan]||'#888')}>{org.plan}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── CLIENTS ── */}
            {tab==='clients' && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, letterSpacing:-.5, marginBottom:4, fontFamily:FONT }}>Clientes</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:FONT }}>{orgs.length} organizaciones registradas</div>
                  </div>
                  <button style={S.btn()} onClick={()=>setShowNewOrg(true)}>+ Nuevo cliente</button>
                </div>
                {orgs.map(org => (
                  <div key={org.id} style={S.card}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:'rgba(196,163,90,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🏨</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'#f0ede8', fontFamily:FONT }}>{org.name}</div>
                          <span style={S.badge(PLAN_COLOR[org.plan]||'#888')}>{org.plan}</span>
                          <span style={S.badge(STATUS_COLOR[org.status]||'#888')}>{org.status||'active'}</span>
                        </div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', display:'flex', gap:16, fontFamily:FONT }}>
                          <span>{org.email}</span>
                          {org.phone&&<span>{org.phone}</span>}
                          {org.country&&<span>{org.country}</span>}
                          <span>{users.filter(u=>u.org_id===(org.org_id||org.id)).length} usuarios</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:7 }}>
                        <button style={S.btnS} onClick={()=>setEditOrg({...org,pipeline_config:JSON.stringify(org.pipeline_config||{},null,2)})}>✏ Editar</button>
                        <button style={S.btnS} onClick={()=>{setSelectedPipeline(org);setTab('pipeline')}} title="Ver pipeline">🗺</button>
                        <button style={S.btnS} onClick={()=>toggleOrgStatus(org)} title={org.status==='active'?'Desactivar':'Activar'}>{org.status==='active'?'⏸':'▶'}</button>
                        <button style={S.btnDel} onClick={()=>deleteOrg(org.id,org.name)}>✕</button>
                      </div>
                    </div>
                    {org.notes&&<div style={{ marginTop:12, padding:'9px 14px', background:'rgba(255,255,255,.04)', borderRadius:8, fontSize:11, color:'rgba(255,255,255,.35)', borderLeft:'2px solid rgba(196,163,90,.35)', fontFamily:FONT }}>{org.notes}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ── USERS ── */}
            {tab==='users' && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, letterSpacing:-.5, marginBottom:4, fontFamily:FONT }}>Usuarios</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:FONT }}>{users.length} usuarios registrados</div>
                  </div>
                  <button style={S.btn()} onClick={()=>setShowNewUser(true)}>+ Nuevo usuario</button>
                </div>
                {users.map(user => {
                  const org = orgs.find(o=>o.org_id===user.org_id||o.id===user.org_id)
                  return (
                    <div key={user.email} style={{ ...S.card, display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#C4A35A,#A8873E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#0a0a0a', flexShrink:0, fontFamily:FONT }}>{user.email[0].toUpperCase()}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#f0ede8', fontFamily:FONT }}>{user.email}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:2, display:'flex', gap:10, alignItems:'center', fontFamily:FONT }}>
                          <span>{user.org_name||user.org_id}</span>
                          {org&&<span style={S.badge(PLAN_COLOR[org.plan]||'#888')}>{org.plan}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:7 }}>
                        <button style={S.btnS} onClick={()=>setChangePwd({email:user.email,pwd:''})}>🔑 Cambiar pass</button>
                        <button style={S.btnS} onClick={()=>resetPassword(user.email)} title="Enviar email de reset">↺</button>
                        <button style={S.btnDel} onClick={()=>deleteUser(user.email)}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── INVOICES ── */}
            {tab==='invoices' && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, letterSpacing:-.5, marginBottom:4, fontFamily:FONT }}>Facturación</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:FONT }}>
                      {invoices.length} facturas · <span style={{ color:'#2a8a6e' }}>{totalRevenue.toFixed(0)} € cobrado</span>
                      {pendingRevenue>0&&<span style={{ color:'#b5621a' }}> · {pendingRevenue.toFixed(0)} € pendiente</span>}
                    </div>
                  </div>
                  <button style={S.btn()} onClick={()=>setShowInvoice(true)}>+ Nueva factura</button>
                </div>
                {invoices.length === 0 ? (
                  <div style={{ ...S.card, textAlign:'center', padding:52 }}>
                    <div style={{ fontSize:32, marginBottom:12, opacity:.2 }}>▣</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.4)', fontFamily:FONT }}>Sin facturas todavía</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.2)', marginTop:6, marginBottom:20, fontFamily:FONT }}>Las facturas generadas aparecerán aquí</div>
                    <button style={S.btn()} onClick={()=>setShowInvoice(true)}>+ Nueva factura</button>
                  </div>
                ) : invoices.map(inv => (
                  <div key={inv.id} style={{ ...S.card, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#f0ede8', fontFamily:FONT }}>{inv.client_name||inv.id}</div>
                        <span style={S.badge(inv.status==='paid'?'#2a8a6e':inv.status==='pending'?'#b5621a':'#6b6760')}>{inv.status}</span>
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:FONT }}>{inv.client_name} · {inv.date}</div>
                    </div>
                    <div style={{ fontSize:17, fontWeight:900, color:'#C4A35A', letterSpacing:-.5, fontFamily:FONT }}>{inv.amount?.toFixed(2)} €</div>
                    <div style={{ display:'flex', gap:7 }}>
                      <button style={S.btnS} onClick={()=>generateInvoicePDF(inv)}>🖨 PDF</button>
                      {inv.status==='pending'&&<button style={{ ...S.btnS, color:'#2a8a6e', borderColor:'rgba(42,138,110,.3)' }} onClick={()=>updateInvoiceStatus(inv.id,'paid')}>✓ Cobrada</button>}
                      {inv.status==='paid'&&<button style={S.btnS} onClick={()=>updateInvoiceStatus(inv.id,'pending')}>↺</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PIPELINE ── */}
            {tab==='pipeline' && (
              <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, flexShrink:0 }}>
                  <div style={{ fontSize:22, fontWeight:900, letterSpacing:-.5, fontFamily:FONT }}>Pipelines</div>
                  <select style={{ ...S.select, width:260 }} value={selectedPipeline?.id||''} onChange={e=>setSelectedPipeline(orgs.find(o=>o.id===e.target.value)||null)}>
                    <option value="">Seleccionar cliente…</option>
                    {orgs.filter(o=>o.supabase_url&&o.supabase_key).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                {selectedPipeline ? (
                  selectedPipeline.supabase_url&&selectedPipeline.supabase_key ? (
                    <iframe key={selectedPipeline.id}
                      src={`/static/pipeline.html?url=${encodeURIComponent(selectedPipeline.supabase_url!)}&key=${encodeURIComponent(selectedPipeline.supabase_key!)}&org=${encodeURIComponent(selectedPipeline.org_id||selectedPipeline.id)}&org_name=${encodeURIComponent(selectedPipeline.name)}&plan=${encodeURIComponent(selectedPipeline.plan)}&pipeline_config=${encodeURIComponent(JSON.stringify(selectedPipeline.pipeline_config||{}))}`}
                      style={{ flex:1, border:'none', borderRadius:12, height:'calc(100vh - 160px)' }}
                      title={selectedPipeline.name}
                    />
                  ) : <div style={{ ...S.card, textAlign:'center', padding:40, color:'rgba(255,255,255,.3)', fontSize:12, fontFamily:FONT }}>Este cliente no tiene credenciales de Supabase configuradas.</div>
                ) : <div style={{ ...S.card, textAlign:'center', padding:52, color:'rgba(255,255,255,.2)', fontSize:12, fontFamily:FONT }}>Selecciona un cliente para ver su pipeline en tiempo real.</div>}
              </div>
            )}
          </div>
        </div>

        {/* ── MODAL NEW ORG ── */}
        {showNewOrg && (
          <div style={S.modal} onClick={e=>{if(e.target===e.currentTarget)setShowNewOrg(false)}}>
            <div style={S.modalBox}>
              <div style={S.modalTitle}>+ Nuevo cliente</div>
              <div style={S.grid2}>
                <div style={S.field}><label style={S.label}>ID interno *</label><input style={S.input} placeholder="hotel_group_bcn" value={newOrg.id} onChange={e=>setNewOrg({...newOrg,id:e.target.value.toLowerCase().replace(/\s/g,'_')})}/></div>
                <div style={S.field}><label style={S.label}>Nombre *</label><input style={S.input} placeholder="Hotel Group Barcelona" value={newOrg.name} onChange={e=>setNewOrg({...newOrg,name:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Email *</label><input style={S.input} type="email" placeholder="contacto@empresa.com" value={newOrg.email} onChange={e=>setNewOrg({...newOrg,email:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Teléfono</label><input style={S.input} placeholder="+34 600 000 000" value={newOrg.phone} onChange={e=>setNewOrg({...newOrg,phone:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Plan</label><select style={S.select} value={newOrg.plan} onChange={e=>setNewOrg({...newOrg,plan:e.target.value})}>{PLANS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Estado</label><select style={S.select} value={newOrg.status} onChange={e=>setNewOrg({...newOrg,status:e.target.value})}>{['trial','active','inactive','pending'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>País</label><input style={S.input} placeholder="Spain" value={newOrg.country} onChange={e=>setNewOrg({...newOrg,country:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Moneda</label><select style={S.select} value={newOrg.pipeline_config.currency} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,currency:e.target.value}})}><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select></div>
                <div style={S.field}><label style={S.label}>NIF/CIF facturación</label><input style={S.input} placeholder="B-12345678" value={newOrg.billing_nif} onChange={e=>setNewOrg({...newOrg,billing_nif:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Supabase URL</label><input style={S.input} placeholder="https://xxxx.supabase.co" value={newOrg.supabase_url} onChange={e=>setNewOrg({...newOrg,supabase_url:e.target.value})}/></div>
                <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Dirección de facturación</label><input style={S.input} placeholder="Calle X, 00, 00000 Ciudad, País" value={newOrg.billing_address} onChange={e=>setNewOrg({...newOrg,billing_address:e.target.value})}/></div>
                <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Supabase Key</label><input style={S.input} placeholder="eyJhbGci…" value={newOrg.supabase_key} onChange={e=>setNewOrg({...newOrg,supabase_key:e.target.value})}/></div>
                <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Notas internas</label><textarea style={S.textarea} placeholder="Observaciones sobre el cliente…" value={newOrg.notes} onChange={e=>setNewOrg({...newOrg,notes:e.target.value})}/></div>
              </div>
              <div style={{borderTop:'1px solid rgba(255,255,255,.07)',paddingTop:20,marginTop:4}}>
                <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.2)',textTransform:'uppercase',letterSpacing:2,marginBottom:16,fontFamily:FONT}}>Pipeline Config</div>
                <div style={S.grid2}>
                  <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Contexto AI (quién es el cliente)</label><textarea style={S.textarea} placeholder="Es un operador hotelero europeo que busca…" value={newOrg.pipeline_config.prompt_context} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,prompt_context:e.target.value}})}/></div>
                  <div style={S.field}><label style={S.label}>Mercado objetivo</label><input style={S.input} placeholder="Miami Beach, Florida" value={newOrg.pipeline_config.target_market} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,target_market:e.target.value}})}/></div>
                  <div style={S.field}><label style={S.label}>Idioma outreach</label><select style={S.select} value={newOrg.pipeline_config.outreach_language} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,outreach_language:e.target.value}})}><option value="es">Español</option><option value="en">English</option><option value="ca">Català</option><option value="fr">Français</option></select></div>
                  <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Criterios de scoring</label><textarea style={S.textarea} placeholder="Sube el score si: ubicación prime…" value={newOrg.pipeline_config.scoring_criteria} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,scoring_criteria:e.target.value}})}/></div>
                  <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Contexto outreach</label><textarea style={S.textarea} placeholder="Somos X, buscamos hoteles para…" value={newOrg.pipeline_config.outreach_context} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,outreach_context:e.target.value}})}/></div>
                  <div style={S.field}><label style={S.label}>CRM</label>
                    <select style={S.select} value={newOrg.pipeline_config.crm||'hubspot'} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,crm:e.target.value}})}>
                      <option value="hubspot">HubSpot</option>
                      <option value="pipedrive">Pipedrive</option>
                      <option value="salesforce">Salesforce</option>
                      <option value="zoho">Zoho CRM</option>
                      <option value="none">Sin CRM</option>
                    </select>
                  </div>
                  <div style={S.field}><label style={S.label}>CRM API Key</label><input style={S.input} placeholder="pat-eu1-… / api_token / Bearer token" value={newOrg.pipeline_config.crm_key||''} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,crm_key:e.target.value,hubspot_key:e.target.value}})}/></div>
                  {(newOrg.pipeline_config.crm==='hubspot'||!newOrg.pipeline_config.crm) && <div style={S.field}><label style={S.label}>HubSpot Pipeline ID</label><input style={S.input} placeholder="default" value={newOrg.pipeline_config.hubspot_pipeline} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,hubspot_pipeline:e.target.value}})}/></div>}
                  {newOrg.pipeline_config.crm==='pipedrive' && <div style={S.field}><label style={S.label}>Pipedrive Domain</label><input style={S.input} placeholder="empresa.pipedrive.com" value={newOrg.pipeline_config.pipedrive_domain||''} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,pipedrive_domain:e.target.value}})}/></div>}
                  {newOrg.pipeline_config.crm==='salesforce' && <div style={S.field}><label style={S.label}>Salesforce Instance URL</label><input style={S.input} placeholder="empresa.salesforce.com" value={newOrg.pipeline_config.salesforce_instance||''} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,salesforce_instance:e.target.value}})}/></div>}
                  <div style={S.field}><label style={S.label}>Fee gestión (%)</label><input style={S.input} type="number" value={newOrg.pipeline_config.revpar_fee_pct} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,revpar_fee_pct:parseFloat(e.target.value)}})}/></div>
                  <div style={S.field}><label style={S.label}>GOP (%)</label><input style={S.input} type="number" value={newOrg.pipeline_config.revpar_gop_pct} onChange={e=>setNewOrg({...newOrg,pipeline_config:{...newOrg.pipeline_config,revpar_gop_pct:parseFloat(e.target.value)}})}/></div>
                </div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
                <button style={S.btnS} onClick={()=>setShowNewOrg(false)}>Cancelar</button>
                <button style={S.btn()} onClick={createOrg} disabled={saving}>{saving?'Creando…':'✓ Crear cliente'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL EDIT ORG ── */}
        {editOrg && (
          <div style={S.modal} onClick={e=>{if(e.target===e.currentTarget)setEditOrg(null)}}>
            <div style={S.modalBox}>
              <div style={S.modalTitle}>✏ Editar {editOrg.name}</div>
              <div style={S.grid2}>
                <div style={S.field}><label style={S.label}>Nombre</label><input style={S.input} value={editOrg.name} onChange={e=>setEditOrg({...editOrg,name:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Email</label><input style={S.input} type="email" value={editOrg.email} onChange={e=>setEditOrg({...editOrg,email:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Plan</label><select style={S.select} value={editOrg.plan} onChange={e=>setEditOrg({...editOrg,plan:e.target.value})}>{PLANS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Estado</label><select style={S.select} value={editOrg.status||'active'} onChange={e=>setEditOrg({...editOrg,status:e.target.value})}>{['trial','active','inactive','pending'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div style={S.field}><label style={S.label}>Teléfono</label><input style={S.input} value={editOrg.phone||''} onChange={e=>setEditOrg({...editOrg,phone:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>País</label><input style={S.input} value={editOrg.country||''} onChange={e=>setEditOrg({...editOrg,country:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>NIF/CIF facturación</label><input style={S.input} value={editOrg.billing_nif||''} onChange={e=>setEditOrg({...editOrg,billing_nif:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Supabase URL</label><input style={S.input} value={editOrg.supabase_url||''} onChange={e=>setEditOrg({...editOrg,supabase_url:e.target.value})}/></div>
                <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Dirección de facturación</label><input style={S.input} value={editOrg.billing_address||''} onChange={e=>setEditOrg({...editOrg,billing_address:e.target.value})}/></div>
                <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Supabase Key</label><input style={S.input} value={editOrg.supabase_key||''} onChange={e=>setEditOrg({...editOrg,supabase_key:e.target.value})}/></div>
                <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Notas</label><textarea style={S.textarea} value={editOrg.notes||''} onChange={e=>setEditOrg({...editOrg,notes:e.target.value})}/></div>
                <div style={{...S.field,gridColumn:'1 / -1'}}><label style={S.label}>Pipeline Config (JSON)</label><textarea style={{...S.textarea,fontFamily:'monospace',fontSize:11,minHeight:180}} value={editOrg.pipeline_config} onChange={e=>setEditOrg({...editOrg,pipeline_config:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
                <button style={S.btnS} onClick={()=>setEditOrg(null)}>Cancelar</button>
                <button style={S.btn()} onClick={updateOrg} disabled={saving}>{saving?'Guardando…':'💾 Guardar'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL NEW USER ── */}
        {showNewUser && (
          <div style={S.modal} onClick={e=>{if(e.target===e.currentTarget)setShowNewUser(false)}}>
            <div style={{...S.modalBox,maxWidth:460}}>
              <div style={S.modalTitle}>+ Nuevo usuario</div>
              <div style={S.field}><label style={S.label}>Email *</label><input style={S.input} type="email" placeholder="usuario@empresa.com" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})}/></div>
              <div style={S.field}><label style={S.label}>Contraseña temporal *</label><input style={S.input} type="text" placeholder="Contraseña123!" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})}/></div>
              <div style={S.field}><label style={S.label}>Organización *</label>
                <select style={S.select} value={newUser.org_id} onChange={e=>setNewUser({...newUser,org_id:e.target.value})}>
                  <option value="">Seleccionar…</option>
                  {orgs.map(o=><option key={o.id} value={o.id}>{o.name} ({o.plan})</option>)}
                </select>
              </div>
              {newUser.org_id&&<div style={{padding:'10px 14px',background:'rgba(196,163,90,.08)',border:'1px solid rgba(196,163,90,.2)',borderRadius:8,fontSize:11,color:'#C4A35A',marginBottom:16,fontFamily:FONT}}>
                Accederá al pipeline de <strong>{orgs.find(o=>o.id===newUser.org_id)?.name}</strong> con plan <strong>{orgs.find(o=>o.id===newUser.org_id)?.plan}</strong>
              </div>}
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button style={S.btnS} onClick={()=>setShowNewUser(false)}>Cancelar</button>
                <button style={S.btn()} onClick={createUser} disabled={saving}>{saving?'Creando…':'✓ Crear usuario'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL INVOICE ── */}
        {showInvoice && (
          <div style={S.modal} onClick={e=>{if(e.target===e.currentTarget)setShowInvoice(false)}}>
            <div style={{...S.modalBox,maxWidth:720}}>
              <div style={S.modalTitle}>▣ Nueva factura</div>
              <div style={S.grid3}>
                <div style={S.field}><label style={S.label}>Nº Factura</label><input style={S.input} value={invoice.num} onChange={e=>setInvoice({...invoice,num:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Fecha emisión</label><input style={S.input} type="date" value={invoice.date} onChange={e=>setInvoice({...invoice,date:e.target.value})}/></div>
                <div style={S.field}><label style={S.label}>Vencimiento</label><input style={S.input} type="date" value={invoice.due} onChange={e=>setInvoice({...invoice,due:e.target.value})}/></div>
              </div>
              <div style={{borderTop:'1px solid rgba(255,255,255,.07)',paddingTop:16,marginBottom:16}}>
                <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.2)',letterSpacing:2,textTransform:'uppercase',marginBottom:14,fontFamily:FONT}}>Emisor (Sapiora)</div>
                <div style={S.grid3}>
                  <div style={S.field}><label style={S.label}>Razón social</label><input style={S.input} value={invoice.from_name} onChange={e=>setInvoice({...invoice,from_name:e.target.value})}/></div>
                  <div style={S.field}><label style={S.label}>NIF/CIF</label><input style={S.input} value={invoice.from_nif} onChange={e=>setInvoice({...invoice,from_nif:e.target.value})}/></div>
                  <div style={S.field}><label style={S.label}>Dirección</label><input style={S.input} value={invoice.from_addr} onChange={e=>setInvoice({...invoice,from_addr:e.target.value})}/></div>
                </div>
              </div>
              <div style={{borderTop:'1px solid rgba(255,255,255,.07)',paddingTop:16,marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.2)',letterSpacing:2,textTransform:'uppercase',fontFamily:FONT}}>Cliente</div>
                  <select style={{...S.select,width:220}} onChange={e=>{const o=orgs.find(x=>x.id===e.target.value);if(o)setInvoice({...invoice,to_name:o.name,to_email:o.email,to_nif:o.billing_nif||'',to_addr:o.billing_address||''})}}>
                    <option value="">Rellenar desde cliente…</option>
                    {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={S.grid2}>
                  <div style={S.field}><label style={S.label}>Razón social</label><input style={S.input} value={invoice.to_name} onChange={e=>setInvoice({...invoice,to_name:e.target.value})}/></div>
                  <div style={S.field}><label style={S.label}>NIF/CIF</label><input style={S.input} value={invoice.to_nif} onChange={e=>setInvoice({...invoice,to_nif:e.target.value})}/></div>
                  <div style={S.field}><label style={S.label}>Dirección</label><input style={S.input} value={invoice.to_addr} onChange={e=>setInvoice({...invoice,to_addr:e.target.value})}/></div>
                  <div style={S.field}><label style={S.label}>Email</label><input style={S.input} value={invoice.to_email} onChange={e=>setInvoice({...invoice,to_email:e.target.value})}/></div>
                </div>
              </div>
              <div style={{borderTop:'1px solid rgba(255,255,255,.07)',paddingTop:16,marginBottom:16}}>
                <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.2)',letterSpacing:2,textTransform:'uppercase',marginBottom:14,fontFamily:FONT}}>Líneas</div>
                {invoice.lines.map((line,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'3fr 1fr 1fr 1fr auto',gap:8,marginBottom:8,alignItems:'center'}}>
                    <input style={S.input} placeholder="Descripción" value={line.desc} onChange={e=>{const l=[...invoice.lines];l[i]={...l[i],desc:e.target.value};setInvoice({...invoice,lines:l})}}/>
                    <input style={S.input} type="number" placeholder="Qty" value={line.qty} onChange={e=>{const l=[...invoice.lines];l[i]={...l[i],qty:parseInt(e.target.value)};setInvoice({...invoice,lines:l})}}/>
                    <input style={S.input} type="number" placeholder="€" value={line.price} onChange={e=>{const l=[...invoice.lines];l[i]={...l[i],price:parseFloat(e.target.value)};setInvoice({...invoice,lines:l})}}/>
                    <input style={S.input} type="number" placeholder="IVA%" value={line.vat} onChange={e=>{const l=[...invoice.lines];l[i]={...l[i],vat:parseFloat(e.target.value)};setInvoice({...invoice,lines:l})}}/>
                    <button style={S.btnDel} onClick={()=>setInvoice({...invoice,lines:invoice.lines.filter((_,j)=>j!==i)})}>✕</button>
                  </div>
                ))}
                <button style={S.btnS} onClick={()=>setInvoice({...invoice,lines:[...invoice.lines,{desc:'',qty:1,price:0,vat:21}]})}>+ Línea</button>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:14,gap:20,fontSize:12,color:'rgba(255,255,255,.4)',fontFamily:FONT}}>
                  <span>Sub: <strong style={{color:'#f0ede8'}}>{invoice.lines.reduce((s,l)=>s+l.qty*l.price,0).toFixed(2)} €</strong></span>
                  <span>IVA: <strong style={{color:'#f0ede8'}}>{invoice.lines.reduce((s,l)=>s+l.qty*l.price*l.vat/100,0).toFixed(2)} €</strong></span>
                  <span style={{fontSize:15}}>Total: <strong style={{color:'#C4A35A'}}>{(invoice.lines.reduce((s,l)=>s+l.qty*l.price,0)+invoice.lines.reduce((s,l)=>s+l.qty*l.price*l.vat/100,0)).toFixed(2)} €</strong></span>
                </div>
              </div>
              <div style={S.field}><label style={S.label}>Notas / condiciones de pago</label><textarea style={S.textarea} placeholder="Transferencia bancaria a: ES00 0000…" value={invoice.notes} onChange={e=>setInvoice({...invoice,notes:e.target.value})}/></div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
                <button style={S.btnS} onClick={()=>setShowInvoice(false)}>Cancelar</button>
                <button style={S.btnS} onClick={()=>{saveInvoice('pending');generateInvoicePDF();setShowInvoice(false)}}>🖨 PDF + Guardar pendiente</button>
                <button style={S.btn()} onClick={()=>{saveInvoice('paid');generateInvoicePDF();setShowInvoice(false)}}>🖨 PDF + Marcar cobrada</button>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* ── MODAL CHANGE PASSWORD ── */}
        {changePwd && (
          <div style={S.modal} onClick={e=>{if(e.target===e.currentTarget)setChangePwd(null)}}>
            <div style={{...S.modalBox,maxWidth:420}}>
              <div style={S.modalTitle}>🔑 Cambiar contraseña</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.4)',marginBottom:20,fontFamily:FONT}}>{changePwd.email}</div>
              <div style={S.field}>
                <label style={S.label}>Nueva contraseña *</label>
                <input style={S.input} type="text" placeholder="Mínimo 6 caracteres" value={changePwd.pwd}
                  onChange={e=>setChangePwd({...changePwd,pwd:e.target.value})}
                  onKeyDown={e=>e.key==='Enter'&&changePassword(changePwd.email,changePwd.pwd)}
                />
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
                <button style={S.btnS} onClick={()=>setChangePwd(null)}>Cancelar</button>
                <button style={S.btn()} onClick={()=>changePassword(changePwd.email,changePwd.pwd)} disabled={saving}>
                  {saving?'Guardando…':'💾 Guardar contraseña'}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  )
}
