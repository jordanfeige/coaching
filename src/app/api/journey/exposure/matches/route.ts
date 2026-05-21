import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import {
  categorizeExposureMatches,
  playerBracketFromBirthDate,
  type ExposureMatchRow,
} from '@/lib/exposure-match-history'

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

  const [{ data: player }, { data: cohortRows }] = await Promise.all([
    supabase
      .from('players')
      .select('birth_date')
      .eq('id', playerId)
      .maybeSingle(),
    supabase
      .from('cohort_benchmarks')
      .select('bracket, year_in_bracket, utr_threshold'),
  ])

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 12)
  const cutoffIso = cutoff.toISOString().split('T')[0]

  const { data: rows, error } = await supabase
    .from('match_results')
    .select(
      `
      id,
      match_date,
      opponent_name,
      opponent_utr_at_time,
      player_utr_at_time,
      event_division,
      event_level,
      event_name,
      event_location,
      result
    `,
    )
    .eq('player_id', playerId)
    .gte('match_date', cutoffIso)
    .order('match_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const matches: ExposureMatchRow[] = (rows ?? []).map(row => ({
    id: String(row.id),
    match_date: String(row.match_date),
    opponent_name: row.opponent_name != null ? String(row.opponent_name) : null,
    opponent_utr_at_time:
      row.opponent_utr_at_time != null
        ? Number(row.opponent_utr_at_time)
        : null,
    player_utr_at_time:
      row.player_utr_at_time != null
        ? Number(row.player_utr_at_time)
        : null,
    event_division:
      row.event_division != null ? String(row.event_division) : null,
    event_level: row.event_level != null ? String(row.event_level) : null,
    event_name: row.event_name != null ? String(row.event_name) : null,
    event_location:
      row.event_location != null ? String(row.event_location) : null,
    result: row.result === 'L' ? 'L' : 'W',
  }))

  const birthDate =
    player?.birth_date != null ? String(player.birth_date) : null
  const cohortBenchmarks = (cohortRows ?? []).map(r => ({
    bracket: String(r.bracket),
    year_in_bracket: Number(r.year_in_bracket),
    utr_threshold: Number(r.utr_threshold),
  }))

  const categories = categorizeExposureMatches(
    matches,
    birthDate,
    cohortBenchmarks,
  )

  return NextResponse.json({
    playerBracket: playerBracketFromBirthDate(birthDate),
    categories,
    counts: {
      quality_wins: categories.quality_wins.length,
      other_wins: categories.other_wins.length,
      losses: categories.losses.length,
      total: matches.length,
    },
  })
}
