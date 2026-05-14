import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
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
          model: model || 'gpt-4o-mini',
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    }

    if (web_search) {
      headers['anthropic-beta'] = 'web-search-2025-03-05'
    }

    const body: any = {
      model: model || 'claude-3-5-haiku-latest',
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