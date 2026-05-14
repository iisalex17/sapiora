import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })
    }

    const msg = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const text =
      msg.content[0].type === 'text'
        ? msg.content[0].text
        : ''

    return NextResponse.json({ text })
  } catch (error) {
    console.error('Anthropic error:', error)
    return NextResponse.json(
      { error: 'Error llamando a Anthropic' },
      { status: 500 }
    )
  }
}