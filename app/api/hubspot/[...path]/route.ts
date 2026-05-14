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