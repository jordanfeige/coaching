import { NextRequest, NextResponse } from 'next/server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export type RecruitingWizardPayload = {
  target_division?: string | null
  pro_interest?: string | null
  geographic_preference?: string | null
  scholarship_need?: string | null
  campus_size?: string | null
  intended_major?: string | null
  gpa?: number | null
  sat_score?: number | null
}

async function userCanManagePlayer(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  playerId: string,
): Promise<boolean> {
  const linkedId = await getLinkedPlayerIdForUser(supabase, userId)
  if (linkedId === playerId) return true

  const { data: familyLink } = await supabase
    .from('account_players')
    .select('player_id')
    .eq('account_id', userId)
    .eq('player_id', playerId)
    .maybeSingle()

  if (familyLink) return true

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .maybeSingle()

  return !!player?.id
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    playerId?: string
    profile?: RecruitingWizardPayload
  }

  const { playerId, profile } = body
  if (!playerId || !profile) {
    return NextResponse.json(
      { error: 'playerId and profile required' },
      { status: 400 },
    )
  }

  const allowed = await userCanManagePlayer(supabase, user.id, playerId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const linkedId = await getLinkedPlayerIdForUser(supabase, user.id)
  const isPlayerSelf = linkedId === playerId

  const admin = createSupabaseAdminClient()

  const { data: existing } = await admin
    .from('recruiting_profiles')
    .select('coach_id')
    .eq('player_id', playerId)
    .maybeSingle()

  const row = {
    player_id: playerId,
    target_division: profile.target_division ?? null,
    pro_interest: profile.pro_interest ?? null,
    geographic_preference: profile.geographic_preference ?? null,
    scholarship_need: profile.scholarship_need ?? null,
    campus_size: profile.campus_size ?? null,
    intended_major: profile.intended_major ?? null,
    gpa: profile.gpa ?? null,
    sat_score: profile.sat_score ?? null,
    wizard_completed: true,
    wizard_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    coach_id: isPlayerSelf
      ? (existing?.coach_id ?? null)
      : user.id,
  }

  const { data: saved, error } = await admin
    .from('recruiting_profiles')
    .upsert(row, { onConflict: 'player_id' })
    .select('id')
    .single()

  if (error) {
    console.error('[recruiting-wizard]', error.message, error.code, error.details)
    return NextResponse.json(
      { error: error.message || 'Failed to save profile' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, profileId: saved?.id })
}
