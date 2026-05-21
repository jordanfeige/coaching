import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import { loadPlayerPracticeStreak } from '@/lib/player-practice-streak'

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

  const payload = await loadPlayerPracticeStreak(supabase, playerId)
  return NextResponse.json(payload)
}
