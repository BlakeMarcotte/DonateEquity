import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Middleware currently has no special redirects
  return NextResponse.next()
}

export const config = {
  matcher: []
}