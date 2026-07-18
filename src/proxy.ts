import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Only apply to the root route
  if (request.nextUrl.pathname === '/') {
    // Check if the user has visited before
    const hasVisited = request.cookies.get('has_visited')

    if (!hasVisited) {
      // Create a response that redirects to the welcome page
      const response = NextResponse.redirect(new URL('/welcome', request.url))
      
      // Set a cookie so we know they've visited (expires in a year)
      response.cookies.set('has_visited', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
      
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
