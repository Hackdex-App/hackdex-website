'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AuthError } from '@supabase/supabase-js'

import { createClient } from '@/utils/supabase/server'

function getErrorMessage(error: AuthError): string {
  const code = (error.code)?.toLowerCase()
  switch (code) {
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'email_not_confirmed':
      return 'Please verify your email before logging in.';
    case 'over_request_rate_limit':
      return 'Too many attempts. Please wait a minute and try again.';
    case 'user_banned':
      return 'This account is currently banned.';
  }
  return error.message || 'Unable to log in. Please try again later.';
}

export type AuthActionState = { error?: string | null }

export async function login(state: AuthActionState, payload: FormData) {
  const supabase = await createClient()

  const data = {
    email: payload.get('email') as string,
    password: payload.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: getErrorMessage(error) }
  }

  revalidatePath('/', 'layout')
  redirect('/account')
}
