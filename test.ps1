cd C:\Users\Alex\Desktop\sapiora

$ErrorActionPreference = "Stop"

$htmlPath = "public\static\pipeline.html"
$root = (Get-Location).Path

if (!(Test-Path $htmlPath)) {
  throw "No encuentro $htmlPath"
}

$backup = "$htmlPath.bak.$(Get-Date -Format yyyyMMddHHmmss)"
Copy-Item $htmlPath $backup

$html = Get-Content -Path $htmlPath -Raw
$utf8 = New-Object System.Text.UTF8Encoding($false)

# ------------------------------------------------------------
# 1) Recrear API AI segura server-side
# ------------------------------------------------------------
$aiDir = Join-Path $root "app\api\ai"
[System.IO.Directory]::CreateDirectory($aiDir) | Out-Null

$routeAi = @'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeAnthropicModel(input: string | undefined, webSearch: boolean) {
  const raw = String(input || '').trim()

  if (!raw) {
    return webSearch ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
  }

  const badLatest =
    raw.includes('latest') ||
    raw === 'claude-3-5-sonnet-latest' ||
    raw === 'claude-3-5-haiku-latest' ||
    raw === 'claude-sonnet-4-5-latest'

  if (badLatest) {
    return webSearch ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
  }

  if (raw === 'claude-sonnet-4-5') return 'claude-sonnet-4-6'
  if (raw === 'claude-haiku-4-5') return 'claude-haiku-4-5-20251001'

  return raw
}

export async function POST(req: Request) {
  try {
    const {
      provider = 'anthropic',
      prompt,
      system = '',
      model = '',
      max_tokens = 1000,
      web_search = false
    } = await req.json()

    if (!prompt) {
      return jsonError('Prompt requerido', 400)
    }

    if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY

      if (!key) {
        return jsonError('OPENAI_API_KEY no configurada', 500)
      }

      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          max_tokens,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: system || 'Responde solo JSON valido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      })

      const data: any = await upstream.json().catch(() => ({}))

      if (!upstream.ok) {
        return jsonError(data?.error?.message || `OpenAI API ${upstream.status}`, upstream.status)
      }

      return NextResponse.json({
        text: data?.choices?.[0]?.message?.content || ''
      })
    }

    const key = process.env.ANTHROPIC_API_KEY

    if (!key) {
      return jsonError('ANTHROPIC_API_KEY no configurada', 500)
    }

    const selectedModel = normalizeAnthropicModel(
      model ||
        (web_search ? process.env.ANTHROPIC_OWNER_MODEL : process.env.ANTHROPIC_SCORING_MODEL) ||
        process.env.ANTHROPIC_MODEL,
      Boolean(web_search)
    )

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    }

    if (web_search) {
      headers['anthropic-beta'] = 'web-search-2025-03-05'
    }

    const body: any = {
      model: selectedModel,
      max_tokens,
      system: system || 'Responde solo JSON valido.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }

    if (web_search) {
      body.tools = [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5
        }
      ]
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    const data: any = await upstream.json().catch(() => ({}))

    if (!upstream.ok) {
      return jsonError(data?.error?.message || `Anthropic API ${upstream.status}`, upstream.status)
    }

    const text = Array.isArray(data?.content)
      ? data.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('')
      : ''

    return NextResponse.json({ text })
  } catch (e: any) {
    return jsonError(e?.message || 'Error AI', 500)
  }
}
'@

[System.IO.File]::WriteAllText((Join-Path $aiDir "route.ts"), $routeAi, $utf8)

# ------------------------------------------------------------
# 2) Recrear proxy HubSpot seguro server-side
# ------------------------------------------------------------
$hsDir = Join-Path $root "app\api\hubspot\[...path]"
[System.IO.Directory]::CreateDirectory($hsDir) | Out-Null

$routeHs = @'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Ctx = {
  params: { path: string[] } | Promise<{ path: string[] }>
}

async function proxy(req: Request, ctx: Ctx) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN

  if (!token) {
    return NextResponse.json(
      { error: 'HUBSPOT_ACCESS_TOKEN no configurado' },
      { status: 500 }
    )
  }

  const params = await Promise.resolve(ctx.params)
  const path = params.path.join('/')

  const incomingUrl = new URL(req.url)
  const targetUrl = new URL(`https://api.hubapi.com/${path}`)
  targetUrl.search = incomingUrl.search

  const headers = new Headers()
  headers.set('Authorization', `Bearer ${token}`)

  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)

  const accept = req.headers.get('accept')
  if (accept) headers.set('Accept', accept)

  const method = req.method.toUpperCase()

  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : await req.text()

  const upstream = await fetch(targetUrl.toString(), {
    method,
    headers,
    body
  })

  const text = await upstream.text()

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json'
    }
  })
}

export async function GET(req: Request, ctx: Ctx) {
  return proxy(req, ctx)
}

export async function POST(req: Request, ctx: Ctx) {
  return proxy(req, ctx)
}

export async function PATCH(req: Request, ctx: Ctx) {
  return proxy(req, ctx)
}

export async function PUT(req: Request, ctx: Ctx) {
  return proxy(req, ctx)
}

export async function DELETE(req: Request, ctx: Ctx) {
  return proxy(req, ctx)
}
'@

[System.IO.File]::WriteAllText((Join-Path $hsDir "route.ts"), $routeHs, $utf8)

# ------------------------------------------------------------
# 3) Parchear helpers en pipeline.html
# ------------------------------------------------------------
$utils = @'
function fixMojibake(input) {
  let s = String(input ?? '');

  const map = {
    'Ã¡':'á','Ã©':'é','Ã­':'í','Ã³':'ó','Ãº':'ú','Ã±':'ñ','Ã‘':'Ñ',
    'ÃÁ':'Á','Ã‰':'É','ÃÍ':'Í','Ã“':'Ó','Ãš':'Ú',
    'Â¿':'¿','Â¡':'¡','Â·':'·','Âº':'º','Âª':'ª','Â ':' ',
    'â€”':'—','â€“':'–','â€˜':'‘','â€™':'’','â€œ':'“','â€�':'”',
    'â€¦':'…','â†’':'→','â†‘':'↑','â†“':'↓','âœ“':'✓','âœ¦':'✦',
    'âš ':'⚠','â˜…':'★'
  };

  Object.keys(map).forEach(k => {
    s = s.split(k).join(map[k]);
  });

  return s.replace(/ðŸ[^ \n\r\t<]{0,10}/g, '').replace(/�/g, '');
}

function cleanText(input) {
  return fixMojibake(input).trim();
}

const esc = s => fixMojibake(s)
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;');

function cleanVisibleText(root) {
  try {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const fixed = fixMojibake(n.nodeValue);
      if (fixed !== n.nodeValue) n.nodeValue = fixed;
    });
  } catch(e) {}
}

function startTextCleaner() {
  cleanVisibleText(document.body);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 3) {
          node.nodeValue = fixMojibake(node.nodeValue);
        } else if (node.nodeType === 1) {
          cleanVisibleText(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

async function callAI({ provider = 'anthropic', prompt, system = '', model = '', max_tokens = 1000, web_search = false }) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      provider,
      prompt,
      system,
      model,
      max_tokens,
      web_search
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Error AI');
  }

  return data.text || '';
}

function cleanAIJson(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseAIJson(text) {
  const clean = cleanAIJson(text);

  try {
    return JSON.parse(clean);
  } catch(e) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('No se pudo parsear JSON de AI');
  }
}

function renderAIResult(result) {
  const score = Math.max(0, Math.min(100, Number(result.score) || 0));
  const flags = Array.isArray(result.flags) ? result.flags : [];

  const flagHtml = flags.length
    ? flags.map(function(f) {
        const type = ['green', 'yellow', 'red'].includes(f.type) ? f.type : 'yellow';
        const icon = type === 'green' ? '✓' : type === 'red' ? '!' : '•';
        return `<div class="flag ${type}"><strong>${icon}</strong><span>${esc(f.text || '')}</span></div>`;
      }).join('')
    : '<div class="flag yellow"><strong>•</strong><span>Sin señales disponibles.</span></div>';

  g('ai-score-content').innerHTML = `
    <div class="score-meter">
      <div class="score-circle" style="border-color:${scoreColor(score)};color:${scoreColor(score)}">${score}</div>
      <div class="score-info">
        <div class="score-title">AI Lead Score</div>
        <div class="score-desc">${esc(result.summary || 'Análisis generado correctamente.')}</div>
        <div class="score-bar-wrap">
          <div class="score-bar" style="width:${score}%;background:${scoreColor(score)}"></div>
        </div>
      </div>
    </div>

    <div class="ai-box">
      <div class="ai-hd">
        <div class="ai-icon">AI</div>
        <div>
          <div class="ai-title">Resumen ejecutivo</div>
          <div class="ai-sub">Análisis de oportunidad</div>
        </div>
      </div>
      <div class="ai-content">${esc(result.summary || '—')}</div>
    </div>

    <div class="ai-box">
      <div class="ai-hd">
        <div class="ai-icon">!</div>
        <div>
          <div class="ai-title">Señales y riesgos</div>
          <div class="ai-sub">Flags detectados</div>
        </div>
      </div>
      <div class="flag-list">${flagHtml}</div>
    </div>

    <div class="ai-box">
      <div class="ai-hd">
        <div class="ai-icon">→</div>
        <div>
          <div class="ai-title">Acción recomendada</div>
          <div class="ai-sub">Esta semana</div>
        </div>
      </div>
      <div class="ai-content">${esc(result.action || 'Priorizar contacto y validación del activo.')}</div>
    </div>
  `;
}

window.addEventListener('load', () => {
  setTimeout(startTextCleaner, 50);
});
'@

$rxEsc = [System.Text.RegularExpressions.Regex]::new("const\s+esc\s*=\s*s\s*=>\s*String\(s\|\|''\)\.replace\(/&/g,'&amp;'\)\.replace\(/</g,'&lt;'\)\.replace\(/>/g,'&gt;'\);")

if ($rxEsc.IsMatch($html)) {
  $html = $rxEsc.Replace($html, $utils, 1)
} elseif ($html -notmatch "function fixMojibake") {
  $html = $html.Replace("const sleep = ms => new Promise(r => setTimeout(r, ms));", $utils + "`r`nconst sleep = ms => new Promise(r => setTimeout(r, ms));")
}

# Limpiar modelos antiguos en el HTML
$html = $html.Replace("claude-3-5-sonnet-latest", "claude-sonnet-4-6")
$html = $html.Replace("claude-3-5-haiku-latest", "claude-haiku-4-5-20251001")
$html = $html.Replace("claude-sonnet-4-5", "claude-sonnet-4-6")
$html = $html.Replace("claude-haiku-4-5',", "claude-haiku-4-5-20251001',")
$html = $html.Replace("claude-haiku-4-5`"", "claude-haiku-4-5-20251001`"")

# ------------------------------------------------------------
# 4) Reemplazar runAIScoring + runOwnerSearch completos
# ------------------------------------------------------------
$aiFunctions = @'
async function runAIScoring() {
  if (!FEAT.aiScoring) { showUpgrade('AI Lead Scoring'); return; }

  const l = all.find(x => x._i === activeId);
  if (!l) return;

  const btn = document.querySelector('#ai-score-content button');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Analizando...';
  }

  g('ai-score-content').innerHTML = `<div class="ai-loading"><div class="spin"></div>Analizando con AI...</div>`;

  const prompt = `Eres un analista de inversiones hoteleras especializado trabajando para un cliente de Sapiora.

Contexto del cliente: ${CONFIG.prompt_context}
Mercado objetivo: ${CONFIG.target_market}

Analiza este activo hotelero y devuelve un JSON con este formato exacto, sin markdown, solo JSON:
{
  "score": <numero 0-100>,
  "summary": "<analisis ejecutivo de 2-3 frases>",
  "flags": [
    {"type": "green", "text": "<senal positiva>"},
    {"type": "yellow", "text": "<riesgo moderado>"},
    {"type": "red", "text": "<red flag>"}
  ],
  "action": "<accion concreta esta semana>"
}

Datos del activo:
- Nombre: ${l.name}
- Direccion: ${l.addr}
- Ciudad: ${l.city}, ${l.state}
- Tipo: ${l.type}
- Habitaciones: ${l.rooms}
- Rating: ${l.rating}
- Tipo de oportunidad: ${l.opp}
- Problema principal: ${l.prob}
- Por que puede mejorarlo: ${l.why}
- Prioridad actual: ${l._prio}

Criterios de scoring especificos:
${CONFIG.scoring_criteria}

Escala:
- 80-100: Oportunidad inmediata
- 60-79: Oportunidad media
- 40-59: Radar
- 0-39: Descartable`;

  const useClaude = ['professional', 'custom', 'enterprise'].includes((FEAT._plan || '').toLowerCase());

  try {
    const text = await callAI({
      provider: useClaude ? 'anthropic' : 'openai',
      model: useClaude ? 'claude-haiku-4-5-20251001' : 'gpt-4o-mini',
      max_tokens: 1000,
      system: 'Eres un analista de inversiones hoteleras. Responde SOLO con JSON valido, sin markdown ni texto adicional.',
      prompt
    });

    const result = parseAIJson(text);
    result.score = Math.max(0, Math.min(100, Number(result.score) || 0));

    if (l._id) {
      aiScores[l._id] = result;
    }

    try {
      localStorage.setItem('y_ai_scores', JSON.stringify(aiScores));
    } catch(e) {}

    l._score = result.score;
    l._aiSummary = result.summary;
    l._aiFlags = result.flags;
    l._aiAction = result.action;

    if (l._id && CFG.url && CFG.key) {
      fetch(`${CFG.url}/rest/v1/${CFG.table}?id=eq.${l._id}`, {
        method: 'PATCH',
        headers: {
          apikey: CFG.key,
          Authorization: 'Bearer ' + CFG.key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          ai_score: result.score,
          ai_summary: result.summary,
          ai_flags: result.flags,
          ai_action: result.action,
          ai_scored_at: new Date().toISOString()
        })
      }).catch(() => {});
    }

    renderAIResult(result);

    g('dp-score-num').textContent = result.score;
    g('dp-score-num').style.color = scoreColor(result.score);
    g('dp-score-badge').style.display = 'flex';

    renderList();
    renderMarkers();
    updateKPIs();

  } catch(e) {
    g('ai-score-content').innerHTML = `<div class="ai-error">Error al conectar con AI: ${esc(e.message)}</div><br><button class="act-gold" onclick="runAIScoring()">Reintentar</button>`;
  }
}

async function runOwnerSearch() {
  const l = all.find(x => x._i === activeId);
  if (!l) return;

  show('owner-result');
  g('owner-result').innerHTML = `<div class="ai-loading"><div class="spin"></div>Buscando propietario con AI...</div>`;

  const prompt = `Eres un investigador experto en real estate hotelero trabajando para un cliente de Sapiora.

Contexto del cliente: ${CONFIG.prompt_context}
Mercado objetivo: ${CONFIG.target_market}
Regiones de busqueda: ${(CONFIG.owner_search_regions || []).join(', ')}

Investiga este hotel y encuentra toda la informacion posible sobre su propietario real.

HOTEL:
- Nombre: ${l.name}
- Direccion: ${l.addr}
- Ciudad: ${l.city}
- Problema: ${l.prob}

BUSQUEDAS:
1. "${l.name} ${l.city} owner LLC"
2. "${l.name} folio property appraiser ${(CONFIG.owner_search_regions || [''])[0]}"
3. "${l.addr} property owner"
4. "${l.name} hotel management company operator"
5. "${l.name} hotel owner LinkedIn CEO"

Contexto para el outreach: ${CONFIG.outreach_context}
El mensaje de contacto debe estar en idioma: ${CONFIG.outreach_language || 'es'}

Devuelve SOLO JSON valido, sin texto antes ni despues:
{
  "owner_name": "<persona o LLC propietaria, o No encontrado>",
  "owner_type": "<Individual / LLC / REIT / Family Office / Hotel Group / No encontrado>",
  "folio_number": "<numero catastral si encontrado, o null>",
  "current_operator": "<empresa gestora actual, o No encontrado>",
  "registered_agent": "<agente registrado, o No encontrado>",
  "linkedin_url": "<URL LinkedIn real, o No encontrado>",
  "linkedin_name": "<nombre perfil LinkedIn, o No encontrado>",
  "contact_info": "<telefono o email, o No encontrado>",
  "contact_strategy": "<2 pasos concretos para llegar al propietario esta semana>",
  "first_message": "<mensaje outreach personalizado, max 3 frases, en ${CONFIG.outreach_language || 'es'}, mencionando el cliente y proponiendo reunion>",
  "confidence": "<alta/media/baja>",
  "red_flags": "<riesgos o barreras, o Ninguna>"
}`;

  try {
    const text = await callAI({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      web_search: true,
      system: 'Eres un investigador experto en real estate hotelero de Miami y Miami Beach. Responde SOLO con JSON valido.',
      prompt
    });

    const r = parseAIJson(text);

    const street = (l.addr || '').split(',')[0].trim();
    const sunbizUrl = 'https://search.sunbiz.org/Inquiry/CorporationSearch/ByAddress?streetAddress=' + encodeURIComponent(street);
    const miamiDadeUrl = 'https://www.miamidade.gov/Apps/PA/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetPropertySearchByAddress&myAddress=' + encodeURIComponent(street);

    l._ownerName = r.owner_name || null;
    l._ownerType = r.owner_type || null;
    l._ownerFolio = r.folio_number || null;
    l._ownerOperator = r.current_operator || null;
    l._ownerLinkedin = r.linkedin_url || null;
    l._ownerContact = r.contact_info || null;
    l._ownerMessage = r.first_message || null;
    l._ownerStrategy = r.contact_strategy || null;
    l._ownerConfidence = r.confidence || null;
    l._ownerFlags = r.red_flags || null;
    l._ownerSearchedAt = new Date().toISOString();

    if (l._id && CFG.url && CFG.key) {
      fetch(`${CFG.url}/rest/v1/${CFG.table}?id=eq.${l._id}`, {
        method: 'PATCH',
        headers: {
          apikey: CFG.key,
          Authorization: 'Bearer ' + CFG.key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          owner_name: r.owner_name || null,
          owner_type: r.owner_type || null,
          owner_folio: r.folio_number || null,
          owner_operator: r.current_operator || null,
          owner_linkedin: r.linkedin_url || null,
          owner_contact: r.contact_info || null,
          owner_message: r.first_message || null,
          owner_strategy: r.contact_strategy || null,
          owner_confidence: r.confidence || null,
          owner_flags: r.red_flags || null,
          owner_searched_at: new Date().toISOString()
        })
      }).then(res => {
        if (res.ok) toast('Owner guardado', 'Datos guardados en Supabase');
      }).catch(() => {});
    }

    const confColor = {
      alta: 'var(--new)',
      media: 'var(--warm)',
      baja: 'var(--hot)'
    }[(r.confidence || '').toLowerCase()] || 'var(--muted)';

    g('owner-result').innerHTML = `
      <div class="ai-box" style="margin-top:12px">
        <div class="ai-hd">
          <div class="ai-icon">ID</div>
          <div>
            <div class="ai-title">${esc(r.owner_name || 'Propietario no identificado')}</div>
            <div class="ai-sub">${esc(r.owner_type || '')} · <span style="color:${confColor};font-weight:700">Confianza ${esc(r.confidence || '—')}</span></div>
          </div>
        </div>
      </div>

      <div class="info-grid">
        ${r.folio_number ? `<div class="ig full" style="background:rgba(196,163,90,.08);border-color:rgba(196,163,90,.25)"><div class="ig-l">Folio Miami-Dade</div><div class="ig-v"><a href="https://miamidadepropertysearch.us/?folio=${esc(r.folio_number)}" target="_blank" style="color:var(--gold-d);font-weight:700;text-decoration:none">${esc(r.folio_number)} ↗</a></div></div>` : ''}

        ${r.registered_agent && r.registered_agent !== 'No encontrado' ? `<div class="ig full"><div class="ig-l">Agente registrado</div><div class="ig-v">${esc(r.registered_agent)}</div></div>` : ''}

        ${r.current_operator && r.current_operator !== 'No encontrado' ? `<div class="ig full"><div class="ig-l">Operador actual</div><div class="ig-v">${esc(r.current_operator)}</div></div>` : ''}

        ${r.linkedin_url && r.linkedin_url !== 'No encontrado' ? `<div class="ig full"><div class="ig-l">LinkedIn</div><div class="ig-v"><a href="${esc(r.linkedin_url)}" target="_blank" style="color:var(--cold);font-weight:700;text-decoration:none">LinkedIn ↗</a></div></div>` : `<div class="ig full"><div class="ig-l">LinkedIn</div><div class="ig-v" style="color:var(--muted2)">No encontrado</div></div>`}

        ${r.contact_info && r.contact_info !== 'No encontrado' ? `<div class="ig full"><div class="ig-l">Contacto directo</div><div class="ig-v" style="color:var(--new);font-weight:600">${esc(r.contact_info)}</div></div>` : ''}

        <div class="ig full"><div class="ig-l">Estrategia de contacto</div><div class="ig-v sm">${esc(r.contact_strategy || '—')}</div></div>

        <div class="ig full gold"><div class="ig-l">Primer mensaje sugerido</div><div class="ig-v sm" style="font-style:italic">${esc(r.first_message || '—')}</div></div>

        ${r.red_flags && r.red_flags !== 'Ninguna' ? `<div class="ig full"><div class="ig-l">Red flags</div><div class="ig-v sm">${esc(r.red_flags)}</div></div>` : ''}
      </div>

      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        ${r.folio_number ? `<a href="https://miamidadepropertysearch.us/?folio=${esc(r.folio_number)}" target="_blank" style="flex:1"><button class="act-gold" style="width:100%">Miami-Dade Folio ↗</button></a>` : `<a href="${miamiDadeUrl}" target="_blank" style="flex:1"><button class="act-s" style="width:100%">Miami-Dade PA ↗</button></a>`}
        <a href="${sunbizUrl}" target="_blank" style="flex:1"><button class="act-s" style="width:100%">Sunbiz ↗</button></a>
        <button class="act-s" onclick="navigator.clipboard.writeText(${JSON.stringify(r.first_message || '')}).then(()=>toast('Copiado','Mensaje en el portapapeles'))">Copiar mensaje</button>
      </div>
    `;
  } catch(e) {
    g('owner-result').innerHTML = `<div class="ai-error" style="margin-top:10px">Error: ${esc(e.message)}</div><br><button class="act-gold" onclick="runOwnerSearch()">Reintentar</button>`;
  }
}

'@

$rxAi = [System.Text.RegularExpressions.Regex]::new("async function runAIScoring\(\)\s*\{[\s\S]*?\r?\n// .{0,40}ASSET MANAGER / REVPAR[^\r\n]*")
$html = $rxAi.Replace($html, $aiFunctions + "`r`n// ASSET MANAGER / REVPAR", 1)

# ------------------------------------------------------------
# 5) Reemplazar scrapeBooking roto
# ------------------------------------------------------------
$bookingFunction = @'
function scrapeBooking() {
  var url = g('booking-url-input') ? g('booking-url-input').value.trim() : '';
  var name = g('nl-name') ? g('nl-name').value.trim() : '';
  var city = g('nl-city') ? g('nl-city').value.trim() : 'Miami';

  if (!url && name) {
    url = 'https://www.booking.com/searchresults.html?ss=' + encodeURIComponent(name + ' ' + city + ' hotel');
    if (g('booking-url-input')) g('booking-url-input').value = url;
  }

  if (!url && !name) {
    toast('Introduce el nombre del hotel primero', 'Booking.com');
    return;
  }

  var btn = g('booking-btn');
  var status = g('booking-status');

  btn.disabled = true;
  btn.textContent = '...';

  status.style.display = 'block';
  status.textContent = 'AI buscando datos de Booking.com...';

  g('booking-result').style.display = 'none';
  bookingData = null;

  var prompt = 'Search Booking.com for: "' + (name || 'hotel') + '" in ' + city + '. URL hint: ' + url + '\nReturn ONLY valid JSON, no markdown, no explanation:\n{"name":"","stars":"1-5","rating":"8.5","reviews":"1234","address":"","city":"","rooms":"50","type":"Hotel","description":"brief","booking_url":""}\nNull for unknown fields.';

  callAI({
    provider: 'openai',
    model: 'gpt-4o',
    max_tokens: 600,
    system: 'Return ONLY valid JSON, no markdown, no explanation.',
    prompt
  })
  .then(function(text) {
    var m = String(text || '').match(/\{[\s\S]*\}/);

    if (m) {
      try {
        bookingData = JSON.parse(m[0]);
        renderBookingResult(bookingData);
        status.textContent = 'Datos encontrados';
      } catch(e) {
        status.textContent = 'Error parseando respuesta.';
      }
    } else {
      status.textContent = 'Sin datos. ' + String(text || '').slice(0, 100);
    }
  })
  .catch(function(e) {
    status.textContent = 'Error: ' + e.message;
  })
  .finally(function() {
    btn.disabled = false;
    btn.innerHTML = 'Buscar';
  });
}

'@

$rxBooking = [System.Text.RegularExpressions.Regex]::new("function scrapeBooking\(\)\s*\{[\s\S]*?\r?\nfunction renderBookingResult\(d\)\s*\{")
$html = $rxBooking.Replace($html, $bookingFunction + "`r`nfunction renderBookingResult(d) {", 1)

# ------------------------------------------------------------
# 6) Proxy HubSpot y limpieza de referencias a keys
# ------------------------------------------------------------
$html = $html.Replace("fetch('/hs/", "fetch('/api/hubspot/")
$html = $html -replace '(?m)^\s*var\s+HUBSPOT_KEY\s*=\s*"[^"]*";\s*$', ''
$html = $html -replace 'const key = CONFIG\.crm_key \|\| HUBSPOT_KEY;', "const key = '';"

# Corregir algunos mojibake en el propio fichero
$repls = @{
  'Ã¡'='á'; 'Ã©'='é'; 'Ã­'='í'; 'Ã³'='ó'; 'Ãº'='ú'; 'Ã±'='ñ'; 'Ã‘'='Ñ';
  'Â¿'='¿'; 'Â¡'='¡'; 'Â·'='·'; 'Âº'='º';
  'â€”'='—'; 'â€“'='–'; 'âœ“'='✓'; 'âœ¦'='✦'; 'â†’'='→'; 'â†“'='↓'
}

foreach ($k in $repls.Keys) {
  $html = $html.Replace($k, $repls[$k])
}

[System.IO.File]::WriteAllText((Join-Path $root $htmlPath), $html, $utf8)

# ------------------------------------------------------------
# 7) .gitignore y .env.local
# ------------------------------------------------------------
if (!(Test-Path ".gitignore")) {
  "" | Set-Content -Path ".gitignore" -Encoding UTF8
}

$gitignore = Get-Content -Path ".gitignore" -Raw

if ($gitignore -notmatch "(?m)^\.env$") {
  Add-Content -Path ".gitignore" -Value ".env"
}

if ($gitignore -notmatch "(?m)^\.env\.local$") {
  Add-Content -Path ".gitignore" -Value ".env.local"
}

if (!(Test-Path ".env.local")) {
  "" | Set-Content -Path ".env.local" -Encoding UTF8
}

$env = Get-Content -Path ".env.local" -Raw

foreach ($k in @("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "HUBSPOT_ACCESS_TOKEN")) {
  if ($env -notmatch "(?m)^$k=") {
    Add-Content -Path ".env.local" -Value "$k="
  }
}

Write-Host ""
Write-Host "OK: pipeline.html reparado"
Write-Host "Backup: $backup"
Write-Host "OK: app/api/ai/route.ts reparado"
Write-Host "OK: app/api/hubspot/[...path]/route.ts reparado"
Write-Host ""

$check = Select-String -Path $htmlPath -Pattern "ANTHROPIC_KEY|OPENAI_KEY|HUBSPOT_KEY|sk-ant|sk-proj|pat-eu1"

if ($check) {
  Write-Warning "Quedan referencias sospechosas:"
  $check
} else {
  Write-Host "OK: sin keys en pipeline.html"
}

Write-Host ""
Write-Host "Ahora ejecuta: npm run build"