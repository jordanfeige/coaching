import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

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

  const {
    profileId,
    playerName,
    sport,
    gender,
    gradYear,
    age,
    gpa,
    wtnSingles,
    utrSingles,
    nationalRank,
    sectionRank,
    winRecord,
    lossRecord,
    ageCategory,
    targetDivision,
    geographicPreference,
    coachAssessment,
    techniqueScore,
    techniqueVelocity,
    topIssues,
    fixedIssues,
    sessionCount,
  } = await req.json()

  const { data: benchmarks } = await supabase
    .from('school_benchmarks')
    .select('*')
    .eq('sport', sport || 'tennis')
    .eq('gender', gender || 'male')
    .order('avg_utr', { ascending: false })

  const currentYear = new Date().getFullYear()
  const yearsUntilGrad = gradYear ? gradYear - currentYear : 3

  const systemPrompt = `You are Via, an expert tennis recruiting analyst for Playvia. You analyze junior player data and generate accurate, appropriately uncertain recruiting projections.

IMPORTANT GUIDELINES:
- Always express projections as ranges, never single numbers
- Be honest about confidence level based on data quality
- Reference NCAA recruiting contact rules accurately
- D1 contact rule: coaches cannot contact until Sept 1 of junior year (with exceptions for campus visits)
- D2/D3/NAIA: can be contacted at any time
- WTN benchmarks for college tennis (approximate):
  * D1 top programs: WTN 1-6 (men), WTN 3-8 (women)
  * D1 mid-major: WTN 6-10 (men), WTN 8-12 (women)
  * D2: WTN 9-13 (men), WTN 12-16 (women)
  * D3: WTN 12-16 (men), WTN 15-19 (women)
  * NAIA: WTN 14-18 (men), WTN 17-21 (women)
- School benchmarks provided are real data
- Never guarantee outcomes
- Coach assessment overrides algorithmic projection
- Technique improvement velocity is a strong predictor

Respond ONLY with valid JSON. No preamble.`

  const benchmarkSummary = benchmarks
    ?.slice(0, 20)
    .map(
      b =>
        `${b.school_name} (${b.division}): WTN avg ${b.avg_wtn_singles}, UTR avg ${b.avg_utr}, region: ${b.regions?.join('/')}`,
    )
    .join('\n')

  const userMessage = `Generate a recruiting profile projection for this player.

PLAYER DATA:
Name: ${playerName}
Sport: ${sport} (${gender})
Age: ${age}
Grad year: ${gradYear} (${yearsUntilGrad} years away)
GPA: ${gpa || 'not provided'}

CURRENT RANKINGS:
WTN Singles: ${wtnSingles || 'not provided'}
UTR Singles: ${utrSingles || 'not provided'}
USTA National Rank: ${nationalRank || 'not provided'} (${ageCategory || ''})
USTA Section Rank: ${sectionRank || 'not provided'}
Win/Loss: ${winRecord}/${lossRecord}

TARGET:
Division: ${targetDivision}
Geographic preference: ${geographicPreference || 'no preference'}

COACH ASSESSMENT:
${coachAssessment || 'not provided'}

PLAYVIA TECHNIQUE DATA:
Current technique score: ${techniqueScore || 'no data'}
Improvement velocity: ${techniqueVelocity || 'unknown'} pts/month
Sessions analyzed: ${sessionCount || 0}
Active issues: ${topIssues?.join(', ') || 'none'}
Fixed issues: ${fixedIssues?.join(', ') || 'none'}

SCHOOL BENCHMARKS (for matching):
${benchmarkSummary || 'no benchmarks available'}

Generate projection JSON:
{
  "confidence": "low|medium|high",
  "confidence_note": "explanation of confidence level",
  "overall_assessment": "2-3 sentence honest assessment",
  "projected_wtn_at_graduation": {
    "low": number,
    "high": number,
    "basis": "explanation"
  },
  "projected_wtn_junior_year": {
    "low": number,
    "high": number
  },
  "recruiting_tier": "D1|D2|D3|NAIA|JC|multiple",
  "school_targets": {
    "reach": [{ "school": "school name", "division": "D1/D2/D3", "why": "one line reason", "wtn_needed": number }],
    "target": [{ "school": "school name", "division": "D1/D2/D3", "why": "one line reason", "wtn_needed": number }],
    "likely": [{ "school": "school name", "division": "D1/D2/D3", "why": "one line reason", "wtn_needed": number }]
  },
  "timeline": [
    {
      "phase": "phase name",
      "timeframe": "e.g. Now - Sophomore year",
      "description": "what to do and why",
      "milestones": ["specific milestone 1", "milestone 2"]
    }
  ],
  "what_needs_to_happen": [
    {
      "priority": "critical|important|nice_to_have",
      "action": "specific action",
      "why": "why this matters for recruiting",
      "technique_connection": "how Playvia data connects (or null)"
    }
  ],
  "via_family_summary": "2-3 sentences written directly to the family, encouraging but honest",
  "recruiting_contact_rules": {
    "d1_contact_opens": "Sept 1 of junior year",
    "d2_d3_contact": "Can be contacted at any time",
    "current_allowed": "what outreach is allowed right now"
  },
  "disclaimer": "standard disclaimer about projection uncertainty"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
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

    const projection = JSON.parse(text)

    if (profileId) {
      await supabase
        .from('recruiting_profiles')
        .update({
          via_projection: projection,
          via_school_targets: projection.school_targets,
          via_timeline: projection.timeline,
          via_what_needs_to_happen: projection.what_needs_to_happen,
          via_summary: projection.via_family_summary,
          via_generated_at: new Date().toISOString(),
        })
        .eq('id', profileId)
    }

    return NextResponse.json({ success: true, projection })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Projection failed'
    console.error('Projection error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
