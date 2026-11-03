'use client'
import React, { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import { FaGamepad } from 'react-icons/fa'

const PLACEHOLDER_BG_CLASSES = [
  'bg-rose-500/70 dark:bg-rose-500/20 shadow-lg shadow-rose-500/50 dark:shadow-rose-500/10',
  'bg-sky-500/70 dark:bg-sky-500/20 shadow-lg shadow-sky-500/50 dark:shadow-sky-500/10',
  'bg-amber-500/70 dark:bg-amber-500/20 shadow-lg shadow-amber-500/50 dark:shadow-amber-500/10',
  'bg-emerald-500/70 dark:bg-emerald-500/20 shadow-lg shadow-emerald-500/50 dark:shadow-emerald-500/10',
  'bg-violet-500/70 dark:bg-violet-500/20 shadow-lg shadow-violet-500/50 dark:shadow-violet-500/10',
  'bg-pink-500/70 dark:bg-pink-500/20 shadow-lg shadow-pink-500/50 dark:shadow-pink-500/10',
  'bg-indigo-500/70 dark:bg-indigo-500/20 shadow-lg shadow-indigo-500/50 dark:shadow-indigo-500/10',
  'bg-cyan-500/70 dark:bg-cyan-500/20 shadow-lg shadow-cyan-500/50 dark:shadow-cyan-500/10',
]

function hashStringToNumber(input: string): number {
  let hash = 0;
  const numChars = Math.min(input.length, 3);
  for (let i = 0; i < numChars; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getPlaceholderBgClass(seed: string | null): string {
  if (!seed) return PLACEHOLDER_BG_CLASSES[0]
  const index = hashStringToNumber(seed) % PLACEHOLDER_BG_CLASSES.length
  return PLACEHOLDER_BG_CLASSES[index]
}

/** Centre-crop to a square and downscale before upload, so a phone photo doesn't ship at full size. */
async function prepareAvatar(file: File, maxSize: number): Promise<File> {
  try {
    if (typeof createImageBitmap !== 'function') return file
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const out = Math.min(maxSize * 2, side)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return file
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' })
  } catch {
    return file
  }
}

export default function Avatar({
  uid,
  url,
  size,
  onUpload,
}: {
  uid: string | null
  url: string | null
  size: number
  onUpload?: (url: string) => void
}) {
  const supabase = createClient()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const placeholderBgClass = getPlaceholderBgClass(uid)
  const isEditable = Boolean(onUpload)

  useEffect(() => {
    async function downloadImage(path: string) {
      try {
        const { data, error } = await supabase.storage.from('avatars').download(path)
        if (error) {
          throw error
        }

        const url = URL.createObjectURL(data)
        setAvatarUrl(url)
      } catch (error) {
        console.log('Error downloading image: ', error)
      }
    }

    if (url) downloadImage(url)
  }, [url, supabase])

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = await prepareAvatar(event.target.files[0], size)
      const fileExt = file.name.split('.').pop()
      const filePath = `${uid}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      if (onUpload) onUpload(filePath)
    } catch (error) {
      alert('Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className={isEditable ? "relative group cursor-pointer" : "relative"}
      style={{ height: size, width: size }}
      onClick={isEditable ? () => fileInputRef.current?.click() : undefined}
      role={isEditable ? "button" : undefined}
      tabIndex={isEditable ? 0 : undefined}
      onKeyDown={isEditable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          fileInputRef.current?.click()
        }
      } : undefined}
      aria-label={isEditable ? "Change avatar" : "User avatar"}
    >
      {avatarUrl ? (
        <Image
          width={size}
          height={size}
          src={avatarUrl}
          alt="Avatar"
          className="avatar image rounded-full object-cover"
          style={{ height: size, width: size }}
        />
      ) : (
        <div
          className={`avatar no-image flex items-center justify-center rounded-full ${placeholderBgClass} text-white/90 dark:text-white/60`}
          style={{ height: size, width: size }}
          aria-label="No avatar placeholder"
        >
          <FaGamepad
            className="opacity-70"
            size={Math.floor(size * 0.6)}
            aria-hidden="true"
          />
        </div>
      )}

      {isEditable && (
        <div className="absolute inset-0 rounded-full bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center select-none">
          {uploading ? 'Uploading…' : 'Change'}
        </div>
      )}

      {isEditable && (
        <input
          ref={fileInputRef}
          style={{ visibility: 'hidden', position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
          type="file"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      )}
    </div>
  )
}
