import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Creating a handler to a GET request to route /auth/confirm
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next') || '/account'
  const next = rawNext.startsWith('/') ? rawNext : `/${rawNext}`

  // Create redirect link without the secret token
  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (error) {
      redirectTo.pathname = '/login'
      redirectTo.searchParams.set('error', error.code || 'UNKNOWN_ERROR')
      return NextResponse.redirect(redirectTo)
    } else {
      return NextResponse.redirect(redirectTo)
    }
  }

  // return the user to login with an error message
  redirectTo.pathname = '/login'
  // Clear all search params
  for (const key of searchParams.keys()) {
    redirectTo.searchParams.delete(key)
  }
  return NextResponse.redirect(redirectTo)
}
