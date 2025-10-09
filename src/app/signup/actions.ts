'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AuthError } from '@supabase/supabase-js'

import { createClient } from '@/utils/supabase/server'
import { validateEmail, validatePassword } from '@/utils/auth'

function getErrorMessage(error: AuthError): string {
  const code = (error.code)?.toLowerCase()
  switch (code) {
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'Signups are currently disabled.';
    case 'weak_password':
      return 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number.';
    case 'email_exists':
    case 'user_already_exists':
    case 'user_already_exists_identity':
      return 'An account with this email already exists.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Please wait a minute and try again.';
  }
  return error.message || 'Unable to sign up. Please try again later.';
}

export interface AuthActionState {
  error?: string | null;
}

export async function signup(state: AuthActionState, payload: FormData) {
  const supabase = await createClient()

  const data = {
    email: payload.get('email') as string,
    password: payload.get('password') as string,
  }

  const { error: emailError } = validateEmail(data.email);
  if (emailError) {
    return { error: emailError };
  }

  const { error: passwordError } = validatePassword(data.password);
  if (passwordError) {
    return { error: passwordError };
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: getErrorMessage(error) };
  }

  revalidatePath('/', 'layout');
  redirect('/account');
}
