import type { SupabaseClient } from '@supabase/supabase-js'
import { computeCollegeMatches } from '@/lib/college-matching'

/**
 * Recompute and persist college_matches for a player (service role).
 */
export async function recomputeCollegeMatchesForPlayer(
  supabase: SupabaseClient,
  playerId: string,
): Promise<{ ok: boolean; count: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service env')
  }

  const matches = await computeCollegeMatches(playerId, url, key)
  return { ok: true, count: matches.length }
}

export function scheduleCollegeMatchRecompute(
  supabase: SupabaseClient,
  playerId: string,
): void {
  recomputeCollegeMatchesForPlayer(supabase, playerId).catch(e => {
    console.error('[college-match-recompute] failed:', playerId, e)
  })
}

/** Fire-and-forget via internal API (for journey-inputs from server routes). */
export function triggerCollegeMatchRecomputeApi(playerId: string): void {
  const secret = process.env.CRON_SECRET
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  if (!secret || !base || !playerId) return

  void fetch(`${base.replace(/\/$/, '')}/api/internal/recompute-matches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerId }),
  }).catch(e => {
    console.error('[college-match-recompute] API trigger failed:', e)
  })
}
