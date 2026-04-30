import { readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { file: string } }
) {
  const allowed = ['pipeline.html', 'admin.html']
  const file = params.file

  if (!allowed.includes(file)) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    const filePath = join(process.cwd(), 'public', 'static', file)
    const html = readFileSync(filePath, 'utf-8')
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}