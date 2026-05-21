import type { SupabaseClient } from '@supabase/supabase-js'
import { getPlayerMatchHistory } from '@/lib/utr'

export type SyncPlayerMatchesOptions = {
  playerId: string
  utrPlayerId: string
  since?: string
}

export type SyncPlayerMatchesResult = {
  inserted: number
  failed: number
  total: number
}

function isRatedUtrStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const s = status.toLowerCase()
  if (s.includes('unrated') || s.includes('not rated')) return false
  return s.includes('rated') || s.includes('verified')
}

/**
 * Resolve UTR player UUID for match sync — only when UTR is verified on file.
 * Primary ID: players.utr_player_id (set by UTR link/sync).
 * Gate: journey_score_inputs.utr_rating with verified=true, or rated utr_status.
 */
export async function resolveVerifiedUtrPlayerId(
  supabase: SupabaseClient,
  playerId: string,
): Promise<string | null> {
  const [{ data: player }, { data: utrInput }] = await Promise.all([
    supabase
      .from('players')
      .select('utr_player_id, utr_status')
      .eq('id', playerId)
      .maybeSingle(),
    supabase
      .from('journey_score_inputs')
      .select('verified')
      .eq('player_id', playerId)
      .eq('category', 'tennis')
      .eq('input_key', 'utr_rating')
      .maybeSingle(),
  ])

  if (!player?.utr_player_id) return null

  const verified =
    utrInput?.verified === true || isRatedUtrStatus(player.utr_status)

  return verified ? player.utr_player_id : null
}

export async function syncPlayerMatches(
  supabase: SupabaseClient,
  opts: SyncPlayerMatchesOptions,
): Promise<SyncPlayerMatchesResult> {
  const matches = await getPlayerMatchHistory(opts.utrPlayerId, {
    since: opts.since,
  })

  let inserted = 0
  let failed = 0

  for (const m of matches) {
    const row = {
      player_id: opts.playerId,
      match_utr_id: m.matchId,
      match_date: m.date,
      event_id: m.eventId,
      event_name: m.eventName,
      event_level: m.eventLevel,
      opponent_utr_id: m.opponentUtrId,
      opponent_name: m.opponentName,
      opponent_utr_at_time: m.opponentUtr,
      player_utr_at_time: m.playerUtr,
      result: m.result,
      score: m.score || null,
      round: m.round,
      sets_played: m.sets > 0 ? m.sets : null,
      is_singles: true,
      source: 'utr_api',
      synced_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('match_results')
      .upsert(row, { onConflict: 'player_id,match_utr_id' })

    if (error) {
      console.error('Match upsert failed:', error.message, m.matchId)
      failed++
      continue
    }
    inserted++
  }

  return { inserted, failed, total: matches.length }
}
