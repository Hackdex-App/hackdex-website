'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AuthError } from '@supabase/supabase-js'
import { validateTurnstileToken } from 'next-turnstile'
import { v4 } from 'uuid';

import { createClient } from '@/utils/supabase/server'
import { safeInternalRedirect } from '@/utils/safeRedirect'
import { validateEmail, validatePassword } from '@/utils/auth'
import { sendDiscordMessageEmbed } from '@/utils/discord'

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
  // Validate Turnstile token first
  const token = payload.get('cf-turnstile-response');
  if (!token || typeof token !== 'string') {
    return { error: 'Verification failed. Please try again.' };
  }

  try {
    const result = await validateTurnstileToken({
      token,
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
      idempotencyKey: v4(),
    });

    if (!result.success) {
      return { error: 'Verification failed. Please try again.' };
    }
  } catch (error) {
    console.error('Turnstile validation error:', error);
    return { error: 'Verification failed. Please try again.' };
  }

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
  redirect(safeInternalRedirect(payload.get('redirectTo'), '/account'));
}
