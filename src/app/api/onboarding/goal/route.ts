import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ensurePlayerForUser } from '@/lib/ensure-player'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const VALID_GOALS = new Set([
  'recruited_college',
  'scholarship_smaller',
  'win_highest_level',
  'improve_have_fun',
  'help_my_child',
  'not_sure_yet',
])

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const primaryGoal = typeof body.primary_goal === 'string' ? body.primary_goal : ''

  if (!VALID_GOALS.has(primaryGoal)) {
    return NextResponse.json({ error: 'Please select a goal' }, { status: 400 })
  }

  const ensured = await ensurePlayerForUser(user.id)
  if ('error' in ensured) {
    return NextResponse.json({ error: ensured.error }, { status: 500 })
  }

  const service = adminClient()
  const { error: prefsError } = await service.from('journey_preferences').upsert(
    {
      player_id: ensured.playerId,
      primary_goal: primaryGoal,
      goal_set_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' },
  )

  if (prefsError) {
    return NextResponse.json({ error: prefsError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, playerId: ensured.playerId })
}
