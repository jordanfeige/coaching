import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

type EnsurePlayerResult =
  | { playerId: string; created: boolean }
  | { error: string }

/**
 * Ensures the auth user has a linked players row (profiles.player_id + account_players).
 * Self-serve signups only get a profile until this runs.
 */
export async function ensurePlayerForUser(userId: string): Promise<EnsurePlayerResult> {
  const supabase = adminClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('player_id, email, full_name, sport, skill_level, age')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    return { error: profileError.message }
  }

  if (profile?.player_id) {
    return { playerId: profile.player_id, created: false }
  }

  const name =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
    (profile?.email ? profile.email.split('@')[0] : null) ||
    'Athlete'

  const playerPayload: Record<string, unknown> = {
    name,
    sport: profile?.sport || 'tennis',
    skill_level: profile?.skill_level || null,
    age: profile?.age ?? null,
    email: profile?.email ?? null,
    parent_id: userId,
  }

  let insertResult = await supabase
    .from('players')
    .insert(playerPayload)
    .select('id')
    .single()

  if (insertResult.error?.message?.includes('email')) {
    const { email: _email, ...withoutEmail } = playerPayload
    insertResult = await supabase.from('players').insert(withoutEmail).select('id').single()
  }

  if (insertResult.error || !insertResult.data?.id) {
    return { error: insertResult.error?.message ?? 'Could not create player profile' }
  }

  const playerId = insertResult.data.id as string

  const { error: linkError } = await supabase
    .from('profiles')
    .update({ player_id: playerId })
    .eq('id', userId)

  if (linkError) {
    return { error: linkError.message }
  }

  await supabase.from('account_players').upsert(
    { account_id: userId, player_id: playerId },
    { onConflict: 'account_id,player_id' },
  )

  return { playerId, created: true }
}
