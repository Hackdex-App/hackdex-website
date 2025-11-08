'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { type User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { FiCheck, FiX, FiCopy } from 'react-icons/fi'
import { setupProfile } from '@/app/account/actions'

type UsernameState =
  | { status: 'idle'; message: string }
  | { status: 'invalid'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'available'; message: string }

const RESERVED_USERNAMES = new Set([
  'admin', 'support', 'help', 'root', 'system', 'null', 'undefined', 'me', 'you', 'owner'
])

function sanitizeUsername(input: string): string {
  const lowered = input.toLowerCase()
  // Keep only a-z, 0-9 and underscore
  return lowered.replace(/[^a-z0-9_]/g, '')
}

function validateUsernameLocal(username: string): string | null {
  // Sorted by priority for good user experience
  if (username.length > 20) return 'Max 20 characters'
  if (/^_/.test(username)) return 'Cannot start or end with underscore'
  if (/__/.test(username)) return 'Avoid consecutive underscores'
  if (username.length < 3) return 'At least 3 characters'
  if (!/^[a-z0-9_]+$/.test(username)) return 'Use letters, numbers, and underscores only'
  if (/_$/.test(username)) return 'Cannot start or end with underscore'
  if (RESERVED_USERNAMES.has(username)) return 'That username is taken'
  return null
}

export default function AccountSetupForm({ user }: { user: User }) {
  const supabase = createClient()
  const router = useRouter()

  const [username, _setUsername] = useState('')
  const [usernameState, setUsernameState] = useState<UsernameState>({ status: 'idle', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const localError = validateUsernameLocal(username)

    if (username.length === 0) {
      setUsernameState({ status: 'idle', message: '' })
      return
    }

    if (localError) {
      setUsernameState({ status: 'invalid', message: localError })
      return
    }

    let active = true
    setUsernameState({ status: 'checking', message: 'Checking availability…' })

    const handle = setTimeout(async () => {
      // Remote availability check (debounced)
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .limit(1)
        .maybeSingle()

      if (!active) return

      if (error) {
        setUsernameState({ status: 'invalid', message: 'Could not verify availability. Try again.' })
        return
      }

      if (data?.id) {
        setUsernameState({ status: 'unavailable', message: 'That username is taken' })
      } else {
        setUsernameState({ status: 'available', message: 'Username is available' })
      }
    }, 450)

    return () => {
      active = false
      clearTimeout(handle)
    }
  }, [username, supabase])

  const isUnavailable = usernameState.status === 'unavailable'
  const isError = isUnavailable || usernameState.status === 'invalid'
  const isAvailable = usernameState.status === 'available'
  const canSubmit = isAvailable && !submitting

  const setUsername = (value: string) => {
    _setUsername(sanitizeUsername(value))
    setCopied(false)
  }

  const profileUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/@${(isAvailable && username && username.length > 0) ? username : 'yourname'}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  async function handleSubmit() {
    if (!canSubmit) return

    try {
      setSubmitting(true)
      const result = await setupProfile(username)

      if (!result || !result.ok) {
        setUsernameState({ status: 'invalid', message: result?.error || 'There was an error saving. Please try again.' })
        return
      }

      // Refresh SSR boundary so the page re-renders into the update form state
      router.refresh()
    } catch (err) {
      setUsernameState({ status: 'invalid', message: 'There was an error saving. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const stateColor =
    usernameState.status === 'available' ? 'text-emerald-600 dark:text-emerald-400' :
    usernameState.status === 'unavailable' || usernameState.status === 'invalid' ? 'text-red-600 dark:text-red-400' :
    'text-foreground/70'
  const bgColor = isError
    ? 'bg-rose-500/5 dark:bg-rose-500/5'
    : isAvailable
      ? 'bg-emerald-600/5 dark:bg-emerald-500/5'
      : 'bg-[var(--surface-2)]'
  const ringColor = isError
    ? 'ring-rose-500/60'
    : isAvailable
      ? 'ring-emerald-600/70 dark:ring-emerald-500/60'
      : 'ring-[var(--border)]'
  const focusRing = isError
    ? 'focus:ring-rose-500/70'
    : isAvailable
      ? 'focus:ring-emerald-600/80 dark:focus:ring-emerald-500/70'
      : 'focus:ring-[var(--ring)]'

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <label htmlFor="username" className="text-sm text-foreground/80">Choose a username<span className="text-red-500">*</span></label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-foreground/60">@</span>
          <input
            id="username"
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourname"
            className={`h-11 w-full rounded-md ${bgColor} pl-8 pr-10 text-sm ring-1 ring-inset ${ringColor} focus:outline-none focus:ring-2 ${focusRing}`}
            aria-describedby="username-help username-status"
            aria-invalid={usernameState.status === 'invalid' || usernameState.status === 'unavailable'}
          />
          {isAvailable && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
              <FiCheck />
            </span>
          )}
          {isUnavailable && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-rose-600 dark:text-rose-400" aria-hidden="true">
              <FiX />
            </span>
          )}
        </div>
        <div id="username-help" className="text-[13px] text-foreground/60">
          3&ndash;20 chars. Letters, numbers, underscores.
        </div>
        {username.length > 0 && (
          <div id="username-status" className={`text-[13px] ${stateColor}`}>
            {usernameState.message}
          </div>
        )}
        <div className={`mt-1 card px-3 py-4 text-sm text-foreground/60 min-h-17 flex items-center overflow-hidden ${isAvailable ? '' : 'opacity-50 cursor-not-allowed'}`} aria-live="polite">
          <div className="flex w-full min-w-0 flex-col gap-2">
            <p className="px-2">After you have uploaded your first hack to Hackdex, others can find your profile at:</p>
            <div className="flex w-full min-w-0 items-center h-10">
              <div className="flex-1 min-w-0 h-full flex items-center overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-color-muted pl-2 text-foreground/70 border-l border-y border-[var(--border)] rounded-l-md">
                <span className={`inline-block whitespace-nowrap text-foreground/80 ${isAvailable ? 'select-all' : 'select-none opacity-70'}`}>{profileUrl}</span>
              </div>
              <button
                type="button"
                onClick={isAvailable ? handleCopy : undefined}
                disabled={!isAvailable}
                className={`relative inline-flex items-center justify-center rounded-r-md px-2 h-full border border-[var(--border)] ${isAvailable ? 'text-foreground/70 hover:border-foreground/50 hover:bg-foreground/10' : 'opacity-50 text-foreground/50'}`}
                aria-label={isAvailable ? (copied ? 'Copied' : 'Copy profile URL') : 'Copy disabled until username is available'}
                aria-disabled={!isAvailable}
              >
                {isAvailable && copied ? <FiCheck /> : <FiCopy />}
                <span className={`pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-foreground ring-1 ring-inset ring-[var(--border)] shadow-sm transition-all duration-150 ${copied ? 'opacity-100 -translate-y-1' : 'opacity-0 translate-y-0'}`}>
                  Copied
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="shine-wrap btn-premium h-14 w-full sm:h-11 sm:w-auto min-w-56 text-sm font-semibold disabled:cursor-not-allowed dark:disabled:opacity-70 disabled:[box-shadow:0_0_0_1px_var(--border)]"
          disabled={!canSubmit}
        >
          <span>{submitting ? 'Creating…' : 'Create my account'}</span>
        </button>
        <form action="/auth/signout" method="post">
          <button className="text-[13px] text-foreground/60 hover:text-foreground/80 underline-offset-4 hover:underline px-0 h-auto" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}


