import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // update user's auth session
  const sessionResponse = await updateSession(request)

  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  if (segments.length === 2 && segments[0] === 'hack') {
    const slug = segments[1]
    const url = request.nextUrl.clone()
    url.pathname = `/hack/${slug}/session`

    const rewriteResponse = NextResponse.rewrite(url)
    sessionResponse.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie)
    })
    return rewriteResponse
  }

  return sessionResponse
}

// All values must be hardcoded in the middleware config,
// which is why the project ID is hardcoded for the cookie key.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    {
      // Production
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      has: [
        { type: 'cookie', key: 'sb-scfxbqapigdjfebqwmoj-auth-token' },
      ]
    },
    {
      // Local development
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      has: [
        { type: 'cookie', key: 'sb-127-auth-token' },
      ]
    },
  ],
}
