import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  // Session is in sessionStorage (client-side only)
  // Just let the page handle the redirect
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}