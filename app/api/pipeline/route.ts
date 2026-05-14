import { readFileSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  const filePath = join(process.cwd(), 'public', 'static', 'pipeline.html')
  const html = readFileSync(filePath, 'utf-8')
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}