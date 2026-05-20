import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

type ProjectionBody = {
  mode?: 'full' | 'suggest_schools'
  profileId?: string
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
  coachAssessment?: string | null
  proInterest?: string | null
  techniqueScore?: number | null
  techniqueVelocity?: string | null
  topIssues?: string[]
  fixedIssues?: string[]
  sessionCount?: number
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

  return {
    ...parsed,
    confidence: 'medium',
    confidence_note: 'Based on synced UTR college roster data.',
    overall_assessment: outlookText,
    via_family_summary: outlookText,
    outlook: {
      snapshot: outlookText,
      confidence: 'medium',
      confidence_note: 'Based on synced UTR college roster data.',
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
  body: ProjectionBody,
) {
  const playerUtr = body.utrSingles ?? 8
  const genderCode = body.gender === 'female' ? 'F' : 'M'

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

  let scheduleFields: ScheduleProfileFields | null = null
  if (body.profileId) {
    const { data: profileSchedule } = await supabase
      .from('recruiting_profiles')
      .select(
        'schedule_strength_score, schedule_avg_opponent_utr, schedule_highest_utr_beaten, schedule_quality_wins, schedule_win_rate_vs_higher, schedule_sanctioned_pct, schedule_total_matches, schedule_summary',
      )
      .eq('id', body.profileId)
      .maybeSingle()
    scheduleFields = profileSchedule
  }

  const matchingSchools = await fetchMatchingColleges(supabase, body)
  const schoolContext = buildCollegeSchoolContext(matchingSchools)

  const currentYear = new Date().getFullYear()
  const yearsUntilGrad = body.gradYear ? body.gradYear - currentYear : 3
  const playerBlock = buildPlayerContext(body, yearsUntilGrad, scheduleFields)

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

    const userMessage = `${playerBlock}

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

      if (body.profileId) {
        await supabase
          .from('recruiting_profiles')
          .update({
            via_suggested_schools: schools,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.profileId)
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

PLAYER PROFILE:
Name: ${body.playerName}
Sport: ${body.sport}
Gender: ${body.gender}
UTR Singles: ${body.utrSingles || 'not set'}
WTN Singles: ${body.wtnSingles || 'not set'}
National rank: ${body.nationalRank || 'not set'}
GPA: ${body.gpa || 'not set'}
Grad year: ${body.gradYear || 'not set'}
Target division: ${body.targetDivision || 'not set'}
Geographic preference: ${body.geographicPreference || 'none'}
Pro tennis interest: ${body.proInterest || 'no'}
Coach assessment: ${body.coachAssessment || 'none'}
Technique score: ${body.techniqueScore || 'not set'}
Sessions analyzed: ${body.sessionCount || 0}
Schedule strength score: ${scheduleFields?.schedule_strength_score ?? 'not calculated'}
Avg opponent UTR: ${scheduleFields?.schedule_avg_opponent_utr ?? 'unknown'}
Highest UTR beaten: ${scheduleFields?.schedule_highest_utr_beaten ?? 'unknown'}
Quality wins (vs higher-rated): ${scheduleFields?.schedule_quality_wins ?? 0}
Win rate vs higher-rated opponents: ${scheduleFields?.schedule_win_rate_vs_higher ?? 0}%
Schedule summary: ${scheduleFields?.schedule_summary || 'no data'}

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
  "proPath": "string or null"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: playerBlock }],
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

    if (body.profileId) {
      await supabase
        .from('recruiting_profiles')
        .update({
          via_projection: parsed,
          via_school_targets: parsed.school_targets,
          via_timeline: parsed.timeline,
          via_what_needs_to_happen: parsed.what_needs_to_happen,
          via_summary: parsed.via_family_summary,
          via_generated_at: new Date().toISOString(),
        })
        .eq('id', body.profileId)
    }

    return NextResponse.json({ success: true, projection: parsed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Projection failed'
    console.error('Projection error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
