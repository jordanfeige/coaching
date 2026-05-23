import type { SupabaseClient } from '@supabase/supabase-js'
import { parseStoragePath } from '@/lib/reel-storage'

/** Signed URL for a reel clip stored on analysis_sessions.storage_path */
export async function signedUrlForReelStorage(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!storagePath?.trim()) return null

  const { bucket, path } = parseStoragePath(storagePath.trim())
  if (!path) return null

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)

  if (error) {
    console.warn('[reel-video] signed URL failed:', error.message)
    return null
  }

  return data?.signedUrl ?? null
}
