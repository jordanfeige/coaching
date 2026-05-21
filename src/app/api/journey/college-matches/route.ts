import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import { buildPlayerSnapshot, computeCollegeMatches } from '@/lib/college-matching'
import { shouldShowCollegeMatches } from '@/lib/college-matching-ui'
import { formatDivision } from '@/lib/college-matching-ui'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const STALE_AFTER_MS = 24 * 60 * 60 * 1000

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

  const { data: prefs } = await supabase
    .from('journey_preferences')
    .select(
      'primary_goal, not_recruiting, wizard_completed_at, target_division, target_academic_tier, target_geography, target_state',
    )
    .eq('player_id', playerId)
    .maybeSingle()

  const showSection = shouldShowCollegeMatches(prefs)
  const wizardComplete = Boolean(prefs?.wizard_completed_at)

  if (!showSection) {
    return NextResponse.json({
      showSection: false,
      wizardComplete,
      summary: { total: 0, likely: 0, target: 0, reach: 0 },
      matches: [],
      playerSnapshot: null,
    })
  }

  const { data: cached } = await supabase
    .from('college_matches')
    .select('computed_at')
    .eq('player_id', playerId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isStale =
    !cached ||
    Date.now() - new Date(cached.computed_at).getTime() > STALE_AFTER_MS

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (isStale && supabaseUrl && serviceKey) {
    try {
      await computeCollegeMatches(playerId, supabaseUrl, serviceKey)
    } catch (e) {
      console.error('[college-matches] stale recompute failed:', e)
    }
  }

  const { data: matches, error: matchErr } = await supabase
    .from('college_matches')
    .select(
      `
      match_score, bucket, tennis_fit, academic_fit, division_fit, geo_fit,
      player_utr_snapshot, player_gpa_snapshot, player_sat_snapshot,
      school_roster_avg, rationale,
      schools (
        ipeds_id, name, city, state, region, academic_tier,
        admission_rate, sat_25th, sat_75th, net_price, url,
        school_tennis_programs ( division, roster_avg_utr, roster_min_utr, roster_max_utr )
      )
    `,
    )
    .eq('player_id', playerId)
    .gte('match_score', 40)
    .order('match_score', { ascending: false })

  if (matchErr) {
    return NextResponse.json({ error: matchErr.message }, { status: 500 })
  }

  const { data: saved } = await supabase
    .from('saved_schools')
    .select('school_id')
    .eq('player_id', playerId)

  const savedIds = new Set((saved ?? []).map(s => s.school_id))

  const rows = (matches ?? []).map(m => {
    const school = m.schools as { ipeds_id?: string } | { ipeds_id?: string }[] | null
    const schoolId = Array.isArray(school)
      ? school[0]?.ipeds_id
      : school?.ipeds_id
    return {
      ...m,
      saved: savedIds.has(String(schoolId ?? '')),
    }
  })

  const summary = {
    total: rows.length,
    likely: rows.filter(m => m.bucket === 'likely').length,
    target: rows.filter(m => m.bucket === 'target').length,
    reach: rows.filter(m => m.bucket === 'reach').length,
  }

  const matchSnap = await buildPlayerSnapshot(supabase, playerId)
  const playerSnapshot = {
    utr: matchSnap.utr,
    projectedUtr: matchSnap.projectedUtr,
    classYear: matchSnap.classYear,
    gpa: matchSnap.gpa,
    sat: matchSnap.sat,
    targetDivision: formatDivision(prefs?.target_division ?? null),
    targetAcademicTier: prefs?.target_academic_tier ?? null,
    targetGeography: prefs?.target_geography ?? null,
  }

  return NextResponse.json({
    showSection: true,
    wizardComplete,
    summary,
    matches: rows,
    playerSnapshot,
  })
}
