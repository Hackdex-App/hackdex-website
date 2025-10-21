'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AuthError } from '@supabase/supabase-js'

import { createClient, createServiceClient } from '@/utils/supabase/server'
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
  const service = await createServiceClient()

  const data = {
    email: payload.get('email') as string,
    password: payload.get('password') as string,
  }
  const inviteCode = (payload.get('inviteCode') as string | null)?.trim() || ''

  const { error: emailError } = validateEmail(data.email);
  if (emailError) {
    return { error: emailError };
  }

  const { error: passwordError } = validatePassword(data.password);
  if (passwordError) {
    return { error: passwordError };
  }

  if (!inviteCode) {
    return { error: 'An invite code is required to sign up.' }
  }

  // Pre-check: ensure invite exists and is unused before attempting signup
  const { data: availableInvite, error: inviteCheckError } = await service
    .from('invite_codes')
    .select('code')
    .eq('code', inviteCode)
    .is('used_by', null)
    .maybeSingle()

  if (inviteCheckError || !availableInvite) {
    return { error: 'Invalid or already used invite code.' }
  }

  const { data: signUpResult, error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: getErrorMessage(error) };
  }

  const userId = signUpResult.user?.id || null
  // Finalize: set used_by to the new user id iff still unused (atomic)
  const { data: finalized, error: finalizeError } = await service
    .from('invite_codes')
    .update({ used_by: userId ?? null })
    .eq('code', inviteCode)
    .is('used_by', null)
    .select('code')
    .maybeSingle()

  if (finalizeError || !finalized) {
    // The code claim could not be finalized (race). Roll back user creation.
    if (userId) {
      try {
        await service.auth.admin.deleteUser(userId)
      } catch {}
    }
    return { error: 'Invite code is no longer available. Please try again.' }
  }

  revalidatePath('/', 'layout');
  const redirectTo = (payload.get('redirectTo') as string | null) || null
  const isValidInternalPath = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
  redirect(isValidInternalPath ? redirectTo! : '/account');
}
