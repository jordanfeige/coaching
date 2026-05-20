import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

type ProjectionBody = {
  mode?: 'full' | 'suggest_schools'
  profileId?: string
  playerId?: string
  playerName?: string
  sport?: string
  gender?: string
  gradYear?: number | null
  age?: number | null
  gpa?: number | null
  wtnSingles?: number | null
  utrSingles?: number | null
  nationalRank?: number | null
  sectionRank?: number | null
  winRecord?: number | null
  lossRecord?: number | null
  ageCategory?: string | null
  targetDivision?: string | null
  geographicPreference?: string | null
  geo?: string | null
  coachAssessment?: string | null
  proInterest?: string | null
  major?: string | null
  scholarship?: string | null
  campusSize?: string | null
  sat?: number | null
  act?: number | null
  scheduleScore?: number | null
  scheduleAvgOpponent?: number | null
  scheduleQualityWins?: number | null
  scheduleWinRate?: number | null
  scheduleSummary?: string | null
  scheduleHighestBeaten?: number | null
  scheduleTotalMatches?: number | null
  techniqueScore?: number | null
  techniqueVelocity?: string | null
  topIssues?: string[]
  fixedIssues?: string[]
  sessionCount?: number
}

function calcConfidence(
  utr: number | null,
  schedule: number | null,
  gpa: number | null,
  sat: number | null,
): 'high' | 'medium' | 'low' {
  let score = 0
  if (utr) score += 3
  if (schedule) score += 2
  if (gpa) score += 2
  if (sat) score += 1
  if (score >= 7) return 'high'
  if (score >= 3) return 'medium'
  return 'low'
}

function buildResolvedPlayerContext(opts: {
  resolvedPlayerName: string
  sport: string
  gradYear: unknown
  resolvedUtrSingles: number | null
  dbProfile: Record<string, unknown> | null
  dbPlayer: Record<string, unknown> | null
  resolvedScheduleScore: number | null
  resolvedScheduleAvgOpponent: number | null
  resolvedScheduleHighestBeaten: number | null
  resolvedScheduleQualityWins: number | null
  resolvedScheduleWinRate: number | null
  resolvedScheduleTotalMatches: number | null
  resolvedScheduleSummary: string | null
  resolvedGpa: number | null
  resolvedSat: number | null
  resolvedAct: number | null
  resolvedMajor: string | null
  resolvedTargetDivision: string | null
  resolvedGeo: string | null
  resolvedProInterest: string | null
  resolvedScholarship: string | null
  resolvedCampusSize: string | null
  resolvedCoachAssessment: string | null
  body: ProjectionBody
}): string {
  const p = opts.dbProfile
  const pl = opts.dbPlayer
  return `
PLAYER: ${opts.resolvedPlayerName}
Sport: ${opts.sport || 'Tennis'}
Grad year: ${p?.grad_year ?? opts.body.gradYear ?? 'unknown'}

TENNIS DATA:
UTR Singles: ${opts.resolvedUtrSingles || 'not linked — no UTR data available'}
UTR Doubles: ${p?.utr_doubles ?? 'not set'}
UTR Status: ${p?.utr_status ?? pl?.utr_status ?? 'unknown'}
UTR last synced: ${pl?.utr_last_synced ?? p?.last_synced_at ?? 'never'}
WTN Singles: ${p?.wtn_singles ?? opts.body.wtnSingles ?? 'not set'}
National rank: ${p?.usta_national_rank ?? opts.body.nationalRank ?? 'not set'}
Section rank: ${p?.usta_section_rank ?? opts.body.sectionRank ?? 'not set'}
Win/Loss: ${
    p?.usta_win_record != null
      ? `${p.usta_win_record}W / ${p.usta_loss_record}L`
      : 'not recorded'
  }

SCHEDULE STRENGTH:
Score: ${opts.resolvedScheduleScore != null ? `${opts.resolvedScheduleScore}/100` : 'not calculated'}
Avg opponent UTR: ${opts.resolvedScheduleAvgOpponent || 'unknown'}
Highest UTR beaten: ${opts.resolvedScheduleHighestBeaten || 'unknown'}
Quality wins vs higher-rated: ${opts.resolvedScheduleQualityWins ?? 0}
Win rate vs higher-rated: ${opts.resolvedScheduleWinRate != null ? `${opts.resolvedScheduleWinRate}%` : 'unknown'}
Total sanctioned matches: ${opts.resolvedScheduleTotalMatches ?? 0}
Schedule summary: ${opts.resolvedScheduleSummary || 'no data'}

ACADEMIC PROFILE:
GPA: ${opts.resolvedGpa || 'not set'}
SAT: ${opts.resolvedSat || 'not set'}
ACT: ${opts.resolvedAct || 'not set'}
Intended major: ${opts.resolvedMajor || 'not set'}

GOALS & PREFERENCES:
Target division: ${opts.resolvedTargetDivision || 'not set'}
Geographic preference: ${opts.resolvedGeo || 'not set'}
Pro interest: ${opts.resolvedProInterest || 'not set'}
Scholarship need: ${opts.resolvedScholarship || 'not set'}
Campus size: ${opts.resolvedCampusSize || 'not set'}

COACH ASSESSMENT:
${opts.resolvedCoachAssessment || 'No coach assessment yet'}

PLAYVIA TECHNIQUE DATA:
Current technique score: ${opts.body.techniqueScore || 'no data'}
Improvement velocity: ${opts.body.techniqueVelocity || 'unknown'} pts/month
Sessions analyzed: ${opts.body.sessionCount || 0}
Active issues: ${opts.body.topIssues?.join(', ') || 'none'}
Fixed issues: ${opts.body.fixedIssues?.join(', ') || 'none'}`
}

type CollegeRow = {
  display_name: string | null
  avg_utr: number | null
  min_utr: number | null
  max_utr: number | null
  division: string | null
  conference: string | null
  sat_25th: number | null
  sat_75th: number | null
  acceptance_rate: number | null
  tuition_out_of_state: number | null
  median_earnings_10yr: number | null
}

type ScheduleProfileFields = {
  schedule_strength_score?: number | null
  schedule_avg_opponent_utr?: number | null
  schedule_highest_utr_beaten?: number | null
  schedule_quality_wins?: number | null
  schedule_win_rate_vs_higher?: number | null
  schedule_sanctioned_pct?: number | null
  schedule_total_matches?: number | null
  schedule_summary?: string | null
}

function buildScheduleContext(schedule?: ScheduleProfileFields | null) {
  if (!schedule) return ''
  return `
SCHEDULE STRENGTH:
Score: ${schedule.schedule_strength_score ?? 'not calculated'}/100
Avg opponent UTR: ${schedule.schedule_avg_opponent_utr ?? 'unknown'}
Highest UTR beaten: ${schedule.schedule_highest_utr_beaten ?? 'unknown'}
Quality wins vs higher-rated: ${schedule.schedule_quality_wins ?? 0}
Win rate vs higher-rated: ${schedule.schedule_win_rate_vs_higher ?? 0}%
Total matches: ${schedule.schedule_total_matches ?? 0}
Sanctioned events: ${schedule.schedule_sanctioned_pct ?? 0}%
Summary: ${schedule.schedule_summary || 'no data'}`
}

const SCHEDULE_INSTRUCTIONS = `
Use schedule strength to add context beyond the UTR number. A player with strong schedule (quality wins vs higher opponents) is more attractive to coaches than an equal UTR with weak schedule. Be specific — reference actual numbers from the schedule strength data.`

function buildPlayerContext(
  body: ProjectionBody,
  yearsUntilGrad: number,
  schedule?: ScheduleProfileFields | null,
) {
  return `PLAYER DATA:
Name: ${body.playerName}
Sport: ${body.sport} (${body.gender})
Age: ${body.age ?? 'unknown'}
Grad year: ${body.gradYear} (${yearsUntilGrad} years away)
GPA: ${body.gpa || 'not provided'}

CURRENT RANKINGS:
WTN Singles: ${body.wtnSingles || 'not provided'}
UTR Singles: ${body.utrSingles || 'not provided'}
USTA National Rank: ${body.nationalRank || 'not provided'} (${body.ageCategory || ''})
USTA Section Rank: ${body.sectionRank || 'not provided'}
Win/Loss: ${body.winRecord}/${body.lossRecord}

TARGET:
Division: ${body.targetDivision}
Geographic preference: ${body.geographicPreference || 'no preference'}

COACH ASSESSMENT:
${body.coachAssessment || 'not provided'}

PLAYVIA TECHNIQUE DATA:
Current technique score: ${body.techniqueScore || 'no data'}
Improvement velocity: ${body.techniqueVelocity || 'unknown'} pts/month
Sessions analyzed: ${body.sessionCount || 0}
Active issues: ${body.topIssues?.join(', ') || 'none'}
Fixed issues: ${body.fixedIssues?.join(', ') || 'none'}${buildScheduleContext(schedule)}`
}

function buildCollegeSchoolContext(schools: CollegeRow[] | null | undefined) {
  return (
    schools
      ?.map(s => {
        const acceptance = s.acceptance_rate
        return (
          `${s.display_name}: ` +
          `avg UTR ${s.avg_utr}, ` +
          `min ${s.min_utr}, ` +
          `max ${s.max_utr}, ` +
          `${s.division}, ` +
          `${s.conference}, ` +
          `SAT 25th ${s.sat_25th ?? 'n/a'}, ` +
          `SAT 75th ${s.sat_75th ?? 'n/a'}, ` +
          `acceptance ${
            acceptance != null
              ? `${Math.round(acceptance * 100)}%`
              : 'n/a'
          }, ` +
          `tuition OOS ${
            s.tuition_out_of_state
              ? s.tuition_out_of_state.toLocaleString()
              : 'n/a'
          }, ` +
          `earnings 10yr ${
            s.median_earnings_10yr
              ? s.median_earnings_10yr.toLocaleString()
              : 'n/a'
          }`
        )
      })
      .join('\n') || 'No matching schools found'
  )
}

function normalizeCollegeProjection(
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  const outlookText = String(parsed.outlook || '')
  const schools =
    (parsed.schools as Array<Record<string, unknown>>) || []

  const school_targets: Record<
    string,
    Array<Record<string, unknown>>
  > = { reach: [], target: [], likely: [] }

  for (const s of schools) {
    const type = String(s.type || 'target').toLowerCase()
    const bucket =
      type === 'reach'
        ? 'reach'
        : type === 'likely'
          ? 'likely'
          : 'target'
    school_targets[bucket].push({
      school: s.name,
      division: s.division,
      why: s.note,
      wtn_needed: s.utrGap,
    })
  }

  const whatNeedsToHappen = parsed.whatNeedsToHappen as
    | string[]
    | undefined
  const what_needs_to_happen =
    whatNeedsToHappen?.map(action => ({
      priority: 'important',
      action,
      why: '',
    })) || []

  const timelineRaw = parsed.timeline as
    | Array<{ period?: string; action?: string }>
    | undefined
  const timeline =
    timelineRaw?.map(t => ({
      phase: t.period,
      timeframe: t.period,
      description: t.action,
    })) || []

  const confRaw = parsed.confidence as
    | { level?: string; reason?: string }
    | string
    | undefined
  const confLevel =
    typeof confRaw === 'object' && confRaw?.level
      ? String(confRaw.level)
      : typeof confRaw === 'string'
        ? confRaw
        : 'medium'
  const confReason =
    typeof confRaw === 'object' && confRaw?.reason
      ? String(confRaw.reason)
      : 'Based on synced UTR college roster data.'

  return {
    ...parsed,
    confidence: confLevel,
    confidence_note: confReason,
    overall_assessment: outlookText,
    via_family_summary: outlookText,
    outlook: {
      snapshot: outlookText,
      confidence: confLevel,
      confidence_note: confReason,
      factors: [],
      actions: what_needs_to_happen.map(w => ({
        title: w.action,
        priority: w.priority,
        detail: w.why,
      })),
    },
    school_targets,
    what_needs_to_happen,
    timeline,
    recruiting_contact_rules: {
      d1_contact_opens: 'Sept 1 of junior year',
      d2_d3_contact: 'Can be contacted at any time',
      current_allowed: 'Varies by division and grad year',
    },
    disclaimer:
      'Projections use real UTR roster averages; outcomes are not guaranteed.',
  }
}

async function fetchMatchingColleges(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  utrSingles: number | null,
  gender?: string,
) {
  const playerUtr = utrSingles ?? 8
  const genderCode = gender === 'female' ? 'F' : 'M'

  const { data } = await supabase
    .from('college_tennis_benchmarks')
    .select(
      'display_name, avg_utr, min_utr, max_utr, division, conference, sat_25th, sat_75th, acceptance_rate, tuition_out_of_state, median_earnings_10yr',
    )
    .gte('avg_utr', playerUtr - 2.0)
    .lte('avg_utr', playerUtr + 1.5)
    .eq('gender', genderCode)
    .order('avg_utr', { ascending: false })
    .limit(30)

  return (data || []) as CollegeRow[]
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const body = (await req.json()) as ProjectionBody
  const mode = body.mode || 'full'
  const profileId = body.profileId
  const playerId = body.playerId

  let dbProfile: Record<string, unknown> | null = null
  let dbPlayer: Record<string, unknown> | null = null

  if (profileId) {
    const { data } = await supabase
      .from('recruiting_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()
    dbProfile = data as Record<string, unknown> | null
  } else if (playerId) {
    const { data } = await supabase
      .from('recruiting_profiles')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle()
    dbProfile = data as Record<string, unknown> | null
  }

  const resolvedPlayerId =
    playerId || (dbProfile?.player_id as string | undefined)

  if (resolvedPlayerId) {
    const { data } = await supabase
      .from('players')
      .select(
        'utr_player_id, utr_singles, utr_doubles, utr_status, utr_last_synced, name',
      )
      .eq('id', resolvedPlayerId)
      .maybeSingle()
    dbPlayer = data as Record<string, unknown> | null
  }

  const resolvedUtrSingles =
    (dbProfile?.utr_singles as number | null) ||
    (dbPlayer?.utr_singles as number | null) ||
    body.utrSingles ||
    null

  const resolvedScheduleScore =
    (dbProfile?.schedule_strength_score as number | null) ||
    body.scheduleScore ||
    null

  const resolvedScheduleAvgOpponent =
    (dbProfile?.schedule_avg_opponent_utr as number | null) ||
    body.scheduleAvgOpponent ||
    null

  const resolvedScheduleQualityWins =
    (dbProfile?.schedule_quality_wins as number | null) ??
    body.scheduleQualityWins ??
    null

  const resolvedScheduleWinRate =
    (dbProfile?.schedule_win_rate_vs_higher as number | null) ??
    body.scheduleWinRate ??
    null

  const resolvedScheduleSummary =
    (dbProfile?.schedule_summary as string | null) ||
    body.scheduleSummary ||
    null

  const resolvedScheduleHighestBeaten =
    (dbProfile?.schedule_highest_utr_beaten as number | null) ||
    body.scheduleHighestBeaten ||
    null

  const resolvedScheduleTotalMatches =
    (dbProfile?.schedule_total_matches as number | null) ??
    body.scheduleTotalMatches ??
    null

  const resolvedGpa =
    (dbProfile?.gpa as number | null) || body.gpa || null

  const resolvedSat =
    (dbProfile?.sat_score as number | null) || body.sat || null

  const resolvedAct =
    (dbProfile?.act_score as number | null) || body.act || null

  const resolvedTargetDivision =
    (dbProfile?.target_division as string | null) ||
    body.targetDivision ||
    null

  const resolvedGeo =
    (dbProfile?.geographic_preference as string | null) ||
    body.geo ||
    body.geographicPreference ||
    null

  const resolvedProInterest =
    (dbProfile?.pro_interest as string | null) ||
    body.proInterest ||
    null

  const resolvedMajor =
    (dbProfile?.intended_major as string | null) || body.major || null

  const resolvedScholarship =
    (dbProfile?.scholarship_need as string | null) ||
    body.scholarship ||
    null

  const resolvedCampusSize =
    (dbProfile?.campus_size as string | null) || body.campusSize || null

  const resolvedCoachAssessment =
    (dbProfile?.coach_assessment as string | null) ||
    (dbProfile?.last_reel_assessment as string | null) ||
    body.coachAssessment ||
    null

  const resolvedPlayerName =
    (dbPlayer?.name as string) || body.playerName || 'Player'

  const resolvedGender =
    (dbProfile?.gender as string) || body.gender || 'male'

  const confidence = calcConfidence(
    resolvedUtrSingles,
    resolvedScheduleScore,
    resolvedGpa,
    resolvedSat,
  )

  const playerContext = buildResolvedPlayerContext({
    resolvedPlayerName,
    sport: body.sport || 'tennis',
    gradYear: dbProfile?.grad_year,
    resolvedUtrSingles,
    dbProfile,
    dbPlayer,
    resolvedScheduleScore,
    resolvedScheduleAvgOpponent,
    resolvedScheduleHighestBeaten,
    resolvedScheduleQualityWins,
    resolvedScheduleWinRate,
    resolvedScheduleTotalMatches,
    resolvedScheduleSummary,
    resolvedGpa,
    resolvedSat,
    resolvedAct,
    resolvedMajor,
    resolvedTargetDivision,
    resolvedGeo,
    resolvedProInterest,
    resolvedScholarship,
    resolvedCampusSize,
    resolvedCoachAssessment,
    body,
  })

  const effectiveProfileId =
    profileId || (dbProfile?.id as string | undefined)

  const matchingSchools = await fetchMatchingColleges(
    supabase,
    resolvedUtrSingles,
    resolvedGender,
  )
  const schoolContext = buildCollegeSchoolContext(matchingSchools)

  if (mode === 'suggest_schools') {
    const systemPrompt = `You are Via, a tennis recruiting analyst for Playvia.
Suggest 3-5 realistic college tennis programs for this player.
Use ONLY the real school data below. Mix reach, target, and likely.
These are SUGGESTIONS for the coach to verify — not confirmed targets.
${SCHEDULE_INSTRUCTIONS}

Respond ONLY with valid JSON:
{
  "schools": [
    {
      "school": "school name",
      "division": "D1|D2|D3|NAIA|JC",
      "type": "reach|target|likely",
      "why": "one line reason",
      "wtn_needed": number,
      "location": "state or region"
    }
  ]
}`

    const userMessage = `${playerContext}

MATCHING SCHOOLS (real UTR + academic data):
${schoolContext}

Return exactly 3-5 schools as JSON.`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      const parsed = JSON.parse(text) as { schools?: unknown[] }
      const schools = parsed.schools || []

      if (effectiveProfileId) {
        await supabase
          .from('recruiting_profiles')
          .update({
            via_suggested_schools: schools,
            updated_at: new Date().toISOString(),
          })
          .eq('id', effectiveProfileId)
      }

      return NextResponse.json({ success: true, schools })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'School suggestions failed'
      console.error('Suggest schools error:', error)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const systemPrompt = `You are Via, a college tennis recruiting analyst inside Playvia.

You have REAL data for every matching school.
Use ONLY the numbers provided below.
Never invent UTR ranges, SAT scores, or acceptance rates.
${SCHEDULE_INSTRUCTIONS}

DATA CONFIDENCE: ${confidence} (based on completeness of UTR, schedule, GPA, SAT)

MATCHING SCHOOLS (real UTR + academic data):
${schoolContext}

Generate a recruiting analysis with:
1. One-sentence overall outlook
2. Top 3 school recommendations from the list above with specific UTR gap analysis
3. What needs to happen to reach goal
4. Timeline with specific milestones
5. If pro interest: note which schools allow summers for ITF circuit

Respond ONLY as valid JSON:
{
  "outlook": "one sentence",
  "schools": [
    {
      "name": "school name",
      "division": "D1/D2/D3/NAIA",
      "type": "reach|target|likely",
      "utrGap": 1.3,
      "satFit": "strong|good|reach|n/a",
      "note": "specific insight"
    }
  ],
  "whatNeedsToHappen": [
    "specific action item"
  ],
  "timeline": [
    {
      "period": "Summer 2026",
      "action": "specific milestone"
    }
  ],
  "proPath": "string or null",
  "confidence": {
    "level": "low|medium|high",
    "reason": "one sentence explanation"
  }
}

CONFIDENCE RULES:
- high = UTR set AND GPA set AND SAT set AND schedule strength calculated
- medium = UTR OR academics partially missing
- low = no UTR and limited match/academic data`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: playerContext }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const parsed = normalizeCollegeProjection(
      JSON.parse(text) as Record<string, unknown>,
    )

    parsed.confidence = confidence
    parsed.confidence_note =
      confidence === 'high'
        ? 'UTR, schedule strength, GPA, and SAT are all on file.'
        : confidence === 'medium'
          ? 'Some recruiting data is still missing.'
          : 'UTR and match history are limited — link UTR for better schools.'

    if (parsed.outlook && typeof parsed.outlook === 'object') {
      const o = parsed.outlook as Record<string, unknown>
      o.confidence = confidence
      o.confidence_note = parsed.confidence_note
    }

    if (effectiveProfileId) {
      await supabase
        .from('recruiting_profiles')
        .update({
          via_projection: parsed,
          via_school_targets: parsed.school_targets,
          via_timeline: parsed.timeline,
          via_what_needs_to_happen: parsed.what_needs_to_happen,
          via_summary: parsed.via_family_summary,
          via_generated_at: new Date().toISOString(),
          projection_generated_at: new Date().toISOString(),
        })
        .eq('id', effectiveProfileId)
    }

    return NextResponse.json({ success: true, projection: parsed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Projection failed'
    console.error('Projection error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
