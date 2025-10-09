'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { type User } from '@supabase/supabase-js'
import Avatar from './Avatar'

export default function AccountForm({ user }: { user: User | null }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [fullname, setFullname] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [website, setWebsite] = useState<string | null>(null)
  const [avatar_url, setAvatarUrl] = useState<string | null>(null)
  const [initialProfile, setInitialProfile] = useState<{
    fullname: string | null
    username: string | null
    website: string | null
    avatar_url: string | null
  }>({ fullname: null, username: null, website: null, avatar_url: null })

  const getProfile = useCallback(async () => {
    try {
      setLoading(true)

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`full_name, username, website, avatar_url`)
        .eq('id', user?.id)
        .single()

      if (error && status !== 406) {
        console.log(error)
        throw error
      }

      if (data) {
        setFullname(data.full_name)
        setUsername(data.username)
        setWebsite(data.website)
        setAvatarUrl(data.avatar_url)
        setInitialProfile({
          fullname: data.full_name,
          username: data.username,
          website: data.website,
          avatar_url: data.avatar_url,
        })
      }
    } catch (error) {
      alert('Error loading user data!')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    getProfile()
  }, [user, getProfile])

  async function updateProfile({
    username,
    website,
    avatar_url,
    fullname,
  }: {
    username: string | null
    fullname: string | null
    website: string | null
    avatar_url: string | null
  }) {
    try {
      setLoading(true)

      const { error } = await supabase.from('profiles').upsert({
        id: user?.id as string,
        full_name: fullname,
        username,
        website,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      setInitialProfile({ fullname, username, website, avatar_url })
      alert('Profile updated!')
    } catch (error) {
      alert('Error updating the data!')
    } finally {
      setLoading(false)
    }
  }

  const normalize = (v: string | null | undefined) => v ?? ''
  const hasChanges =
    normalize(fullname) !== normalize(initialProfile.fullname) ||
    normalize(username) !== normalize(initialProfile.username) ||
    normalize(website) !== normalize(initialProfile.website) ||
    normalize(avatar_url) !== normalize(initialProfile.avatar_url)

  return (
    <div className="grid gap-8">
      <div className="flex items-center gap-6">
        <Avatar
          uid={user?.id ?? null}
          url={avatar_url}
          size={120}
          onUpload={(url) => {
            setAvatarUrl(url)
            updateProfile({ fullname, username, website, avatar_url: url })
          }}
        />
        <div className="text-sm text-foreground/70">
          <div className="text-xl font-semibold text-foreground">{fullname || <span className="italic text-foreground/80">No name</span>}</div>
          <div className="text-sm text-foreground/70">{username ? `@${username}` : <span className="italic text-foreground/60">No username</span>}</div>
          <div className="mt-3">Update your profile details and avatar.</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <label htmlFor="email" className="text-sm text-foreground/80">Email</label>
          <input id="email" type="text" value={user?.email || ''} disabled className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm text-foreground/70 ring-1 ring-inset ring-[var(--border)]" />
        </div>

        <div className="grid gap-2">
          <label htmlFor="fullName" className="text-sm text-foreground/80">Name</label>
          <input
            id="fullName"
            type="text"
            value={fullname || ''}
            onChange={(e) => setFullname(e.target.value)}
            className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="username" className="text-sm text-foreground/80">Username</label>
          <input
            id="username"
            type="text"
            value={username || ''}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <label htmlFor="website" className="text-sm text-foreground/80">Website</label>
          <input
            id="website"
            type="url"
            value={website || ''}
            onChange={(e) => setWebsite(e.target.value)}
            className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <div className="sm:col-span-2 flex flex-col justify-center items-center gap-4 mt-4 sm:flex-row sm:justify-end">
          <button
            className="shine-wrap btn-premium h-14 min-w-48 sm:h-11 sm:min-w-[7.5rem] text-sm font-semibold dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]"
            onClick={() => updateProfile({ fullname, username, website, avatar_url })}
            disabled={loading || !hasChanges}
          >
            <span>{loading ? 'Saving...' : 'Update profile'}</span>
          </button>
          <form action="/auth/signout" method="post">
            <button className="inline-flex h-14 min-w-48 sm:h-11 sm:min-w-[7.5rem] items-center justify-center rounded-md border border-red-600/40 bg-red-600/5 dark:border-red-400/40 dark:bg-red-400/5 px-4 text-sm font-medium text-red-600/90 dark:text-red-400/80 transition-colors hover:bg-red-600/5 dark:hover:bg-red-400/10" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
