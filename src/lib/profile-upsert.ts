import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { defaultBetaStatus } from '@/lib/beta-gate'

export type ProfileUpsertInput = {
  id: string
  email: string
  role: 'coach' | 'player'
  full_name?: string | null
  beta_status?: string
  analyses_used?: number
  is_subscribed?: boolean
  player_id?: string | null
}

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function isMissingColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("Could not find the") ||
      error?.message?.includes('schema cache'),
  )
}

/** Service-role upsert; tolerates older schemas missing optional columns. */
export async function upsertProfileAdmin(
  input: ProfileUpsertInput,
  options?: { hostname?: string | null },
) {
  const supabase = adminClient()
  const fullPayload = {
    id: input.id,
    email: input.email,
    role: input.role,
    full_name: input.full_name ?? null,
    player_id: input.player_id ?? null,
    beta_status: input.beta_status ?? defaultBetaStatus(options?.hostname),
    analyses_used: input.analyses_used ?? 0,
    is_subscribed: input.is_subscribed ?? false,
  }

  let result = await supabase.from('profiles').upsert(fullPayload, { onConflict: 'id' })
  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase.from('profiles').upsert(
      {
        id: fullPayload.id,
        email: fullPayload.email,
        role: fullPayload.role,
        player_id: fullPayload.player_id,
      },
      { onConflict: 'id' },
    )
  }

  return result
}
