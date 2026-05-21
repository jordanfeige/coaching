import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim() || !key?.trim()) {
    return 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.'
  }
  if (!url.startsWith('https://')) {
    return 'NEXT_PUBLIC_SUPABASE_URL must start with https://'
  }
  return null
}

export function createClient() {
  const configError = getSupabaseConfigError()
  if (configError) {
    throw new Error(configError)
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}