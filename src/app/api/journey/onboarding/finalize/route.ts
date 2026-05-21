import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { scheduleCollegeMatchRecompute } from '@/lib/college-match-recompute'
import { updateJourneyInput } from '@/lib/journey-inputs'
import { recalcJourneyRating } from '@/lib/journey-recalc'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.player_id) {
    return NextResponse.json({ error: 'No player' }, { status: 404 })
  }

  const playerId = profile.player_id
  const { classYear, birthDate, utr, academics, tournaments, targeting } =
    body as {
      classYear?: string
      birthDate?: string | null
      utr?: { mode: string; utr?: number; utr_id?: string }
      academics?: { gpa?: number | null; sat?: number | null }
      tournaments?: { count?: number | null }
      targeting?: {
        division?: string
        academic_tier?: string
        geography?: string
        state?: string | null
      }
    }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const [
    { data: prevPlayer },
    { data: prevPrefs },
    { data: prevRecruiting },
  ] = await Promise.all([
    service
      .from('players')
      .select('birth_date')
      .eq('id', playerId)
      .maybeSingle(),
    service
      .from('journey_preferences')
      .select('target_division, target_academic_tier, target_geography')
      .eq('player_id', playerId)
      .maybeSingle(),
    service
      .from('recruiting_profiles')
      .select('grad_year')
      .eq('player_id', playerId)
      .maybeSingle(),
  ])

  let birthDateChanged = false

  if (classYear) {
    const gradYear =
      classYear === '2030+'
        ? 2030
        : parseInt(String(classYear).replace(/\D/g, ''), 10)
    if (Number.isFinite(gradYear)) {
      const { data: existing } = await service
        .from('recruiting_profiles')
        .select('id')
        .eq('player_id', playerId)
        .maybeSingle()

      if (existing) {
        await service
          .from('recruiting_profiles')
          .update({
            grad_year: gradYear,
            updated_at: new Date().toISOString(),
          })
          .eq('player_id', playerId)
      } else {
        await service.from('recruiting_profiles').insert({
          player_id: playerId,
          grad_year: gradYear,
          wizard_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
  }

  if (utr?.mode === 'verified' && utr.utr) {
    await updateJourneyInput({
      playerId,
      category: 'tennis',
      inputKey: 'utr_rating',
      valueNumeric: utr.utr,
      unit: 'utr_points',
      source: 'utr_api',
      verified: true,
      triggerRecalc: false,
    })
    if (utr.utr_id) {
      await service
        .from('players')
        .update({ utr_player_id: String(utr.utr_id) })
        .eq('id', playerId)
    }
  } else if (utr?.mode === 'self_reported' && utr.utr) {
    await updateJourneyInput({
      playerId,
      category: 'tennis',
      inputKey: 'utr_rating',
      valueNumeric: utr.utr,
      unit: 'utr_points',
      source: 'self_reported',
      verified: false,
      triggerRecalc: false,
    })
  }

  if (academics?.gpa) {
    await updateJourneyInput({
      playerId,
      category: 'academics',
      inputKey: 'gpa',
      valueNumeric: academics.gpa,
      unit: 'gpa',
      source: 'self_reported',
      verified: false,
      triggerRecalc: false,
    })
  }
  if (academics?.sat) {
    await updateJourneyInput({
      playerId,
      category: 'academics',
      inputKey: 'sat',
      valueNumeric: academics.sat,
      unit: 'sat',
      source: 'self_reported',
      verified: false,
      triggerRecalc: false,
    })
  }

  if (tournaments?.count != null) {
    await updateJourneyInput({
      playerId,
      category: 'exposure',
      inputKey: 'sanctioned_tournaments_12mo',
      valueNumeric: tournaments.count,
      unit: 'count',
      source: 'self_reported',
      verified: false,
      triggerRecalc: false,
    })
  }

  if (birthDate && typeof birthDate === 'string') {
    const parsed = new Date(`${birthDate}T12:00:00`)
    const now = new Date()
    const min = new Date('1970-01-01T12:00:00')
    if (parsed > now || parsed < min || Number.isNaN(parsed.getTime())) {
      console.warn(`Invalid birth_date submitted: ${birthDate}`)
    } else {
      const { error: birthErr } = await service
        .from('players')
        .update({ birth_date: birthDate })
        .eq('id', playerId)

      if (birthErr) {
        console.error('players.birth_date update failed:', birthErr)
      } else if (prevPlayer?.birth_date !== birthDate) {
        birthDateChanged = true
      }
    }
  }

  const newGradYear =
    classYear === '2030+'
      ? 2030
      : classYear
        ? parseInt(String(classYear).replace(/\D/g, ''), 10)
        : null

  await service.from('journey_preferences').upsert({
    player_id: playerId,
    target_division:
      targeting?.division !== 'not_sure' ? targeting?.division ?? null : null,
    target_academic_tier:
      targeting?.academic_tier !== 'no_preference'
        ? targeting?.academic_tier ?? null
        : null,
    target_geography: targeting?.geography ?? null,
    target_state: targeting?.state ?? null,
    wizard_completed_at: new Date().toISOString(),
    recruiting_banner_dismissed: true,
    updated_at: new Date().toISOString(),
  })

  const targetingChanged =
    !prevPrefs ||
    prevPrefs.target_division !==
      (targeting?.division !== 'not_sure' ? targeting?.division ?? null : null) ||
    prevPrefs.target_academic_tier !==
      (targeting?.academic_tier !== 'no_preference'
        ? targeting?.academic_tier ?? null
        : null) ||
    prevPrefs.target_geography !== (targeting?.geography ?? null)

  const classYearChanged =
    Number.isFinite(newGradYear) &&
    newGradYear !== (prevRecruiting?.grad_year ?? null)

  if (targetingChanged || birthDateChanged || classYearChanged) {
    scheduleCollegeMatchRecompute(service, playerId)
  }

  await recalcJourneyRating(
    playerId,
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  return NextResponse.json({ ok: true })
}
