import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, payload } = body

  // Scoring — Claude Haiku
  if (type === 'score') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: 'Eres un analista de inversiones hoteleras. Responde SOLO con JSON válido, sin markdown ni texto adicional.',
        messages: [{ role: 'user', content: payload.prompt }]
      })
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
    return NextResponse.json(data)
  }

  // Owner Search — Claude Sonnet with web search
  if (type === 'owner') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        system: 'Eres un investigador experto en real estate hotelero. Busca información real. Responde SOLO con JSON al final.',
        messages: [{ role: 'user', content: payload.prompt }]
      })
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
