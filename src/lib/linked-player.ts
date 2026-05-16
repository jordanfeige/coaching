import type { SupabaseClient } from '@supabase/supabase-js'

export type LinkedPlayer = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  age?: number | null
  skill_level?: string | null
  sport?: string | null
  notes?: string | null
}

/**
 * One shared account for the athlete / family: prefer `profiles.player_id`,
 * fall back to legacy `players.parent_id` for existing data.
 */
export async function getLinkedPlayerIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase.from('profiles').select('player_id').eq('id', userId).maybeSingle()
  if (profile?.player_id) return profile.player_id
  const { data: row } = await supabase.from('players').select('id').eq('parent_id', userId).maybeSingle()
  return row?.id ?? null
}

export async function getLinkedPlayerRowForUser(supabase: SupabaseClient, userId: string) {
  const id = await getLinkedPlayerIdForUser(supabase, userId)
  if (!id) return null
  const { data } = await supabase.from('players').select('*').eq('id', id).single()
  return data ?? null
}

export async function getLinkedPlayersForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<LinkedPlayer[]> {
  const playersById = new Map<string, LinkedPlayer>()

  const { data: linkedRows } = await supabase
    .from('account_players')
    .select('players(id, name, email, phone, age, skill_level, sport, notes)')
    .eq('account_id', userId)

  for (const row of linkedRows ?? []) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players
    if (player?.id) playersById.set(player.id, player as LinkedPlayer)
  }

  const { data: profile } = await supabase.from('profiles').select('player_id').eq('id', userId).maybeSingle()
  if (profile?.player_id && !playersById.has(profile.player_id)) {
    const { data: p } = await supabase.from('players').select('*').eq('id', profile.player_id).maybeSingle()
    if (p?.id) playersById.set(p.id, p as LinkedPlayer)
  }

  const { data: legacyRows } = await supabase.from('players').select('*').eq('parent_id', userId)
  for (const player of legacyRows ?? []) {
    if (player?.id) playersById.set(player.id, player as LinkedPlayer)
  }

  return [...playersById.values()].sort((a, b) => a.name.localeCompare(b.name))
}
