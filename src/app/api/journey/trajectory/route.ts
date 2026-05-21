import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import {
  computePlayerTrajectory,
  diagnoseTrajectoryGaps,
} from '@/lib/utr-forecast'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return NextResponse.json({ error: 'No player' }, { status: 404 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
  }

  const service = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const missing = await diagnoseTrajectoryGaps(playerId, service)
  const trajectory = await computePlayerTrajectory(playerId, service)

  const { data: trackRows } = await service
    .from('goal_tracks')
    .select('goal_key, age, utr_target, label')
    .order('age')

  const goalTracks: Record<string, { age: number; utr: number; label: string }[]> =
    {}
  for (const row of trackRows ?? []) {
    const key = row.goal_key as string
    if (!goalTracks[key]) goalTracks[key] = []
    goalTracks[key].push({
      age: row.age,
      utr: Number(row.utr_target),
      label: row.label,
    })
  }

  if (!trajectory) {
    return NextResponse.json({
      trajectory: null,
      goalTracks,
      reason: 'no_utr_or_birth_date',
      missing,
    })
  }

  return NextResponse.json({ trajectory, goalTracks })
}
