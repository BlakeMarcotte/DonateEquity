import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if this is a request to /organization from a logged-in nonprofit admin
  if (request.nextUrl.pathname === '/organization') {
    // Check if this is coming from the tasks page (has from=tasks parameter)
    const fromTasks = request.nextUrl.searchParams.get('from') === 'tasks'
    
    // If not coming from tasks, redirect to tasks
    if (!fromTasks) {
      const url = request.nextUrl.clone()
      url.pathname = '/tasks'
      return NextResponse.redirect(url)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/organization/:path*']
}