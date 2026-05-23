import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export async function assertUserOwnsMatch(
  supabase: SupabaseClient,
  user: User,
  matchId: string,
): Promise<{ playerId: string } | { error: string; status: number }> {
  const { data: match } = await supabase
    .from('matches')
    .select('id, player_id')
    .eq('id', matchId)
    .single()

  if (!match) return { error: 'Not found', status: 404 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', user.id)
    .single()

  if (!profile?.player_id || profile.player_id !== match.player_id) {
    return { error: 'Forbidden', status: 403 }
  }

  return { playerId: match.player_id }
}

export async function assertUserOwnsChunk(
  supabase: SupabaseClient,
  user: User,
  chunkId: string,
): Promise<
  | { playerId: string; matchId: string }
  | { error: string; status: number }
> {
  const { data: chunk } = await supabase
    .from('match_chunks')
    .select('id, match_id, matches!inner(player_id)')
    .eq('id', chunkId)
    .single()

  if (!chunk) return { error: 'Chunk not found', status: 404 }

  const match = chunk.matches as unknown as { player_id: string }

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', user.id)
    .single()

  if (!profile?.player_id || profile.player_id !== match.player_id) {
    return { error: 'Forbidden', status: 403 }
  }

  return { playerId: match.player_id, matchId: chunk.match_id }
}
