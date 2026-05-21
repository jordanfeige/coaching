import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { defaultReelTitle, normalizeReelTitle } from '@/lib/reel-display'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

type TextIssue = {
  area?: string
  severity?: string
  explanation?: string
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI analysis is not configured' }, { status: 500 })
  }

  const body = await req.json()
  const {
    description,
    sport,
    context,
    shotTypes,
    title: titleInput,
    playerId,
    lessonId,
  } = body as {
    description?: string
    sport?: string
    context?: string
    shotTypes?: string[]
    title?: string
    playerId?: string | null
    lessonId?: string | null
  }

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to analyze sessions' }, { status: 401 })
  }

  let resolvedPlayerId = playerId || null
  if (!resolvedPlayerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('player_id')
      .eq('id', user.id)
      .maybeSingle()
    resolvedPlayerId = profile?.player_id ?? null
  }

  const systemPrompt = `You are Via, an expert sports technique coach analyzing a player's self-reported session.

The player has described their session in their own words.
Your job is to:
1. Extract specific technique issues from their description
2. Identify what they did well (strengths)
3. Estimate a technique score (0-100) based on what they described
4. Prescribe specific drills for each issue
5. Ask ONE clarifying question ONLY if critical information is missing (e.g. if you can't tell which shot had the issue)

Respond ONLY with valid JSON. No preamble.

JSON schema:
{
  "overall_score": number (0-100),
  "confidence": "low" | "medium" | "high",
  "confidence_note": "string explaining score confidence",
  "clarifyingQuestion": "string or null",
  "clarifyingOptions": ["option1", "option2"] or [],
  "areas_to_improve": [
    {
      "area": "string",
      "severity": "critical" | "moderate" | "minor",
      "explanation": "string",
      "biomechanical_impact": "string",
      "drill": "string",
      "drill_instructions": "string",
      "sets_reps": "string"
    }
  ],
  "strengths": [
    {
      "area": "string",
      "explanation": "string"
    }
  ],
  "top_issue": "string",
  "biggest_win": "string",
  "via_summary": "string (1-2 sentence personal summary)"
}

Score guidance:
- 85-100: Only minor issues mentioned, mostly positive
- 70-84: 1-2 moderate issues, some strengths
- 55-69: Multiple issues, technique needs work
- Below 55: Critical issues dominating the session

If confidence is low (vague description), still provide analysis but note it in confidence_note.`

  const userMessage = `Sport: ${sport || 'tennis'}
${context || ''}

Player's session description:
"${description}"

Analyze this session and extract structured technique feedback.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    const clean = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const result = JSON.parse(clean) as {
      clarifyingQuestion?: string | null
      overall_score?: number
      top_issue?: string
      biggest_win?: string
      areas_to_improve?: TextIssue[]
      strengths?: unknown[]
      confidence?: string
    }

    if (result.clarifyingQuestion) {
      return NextResponse.json(result)
    }

    const issues = Array.isArray(result.areas_to_improve)
      ? result.areas_to_improve
      : []
    const strengths = Array.isArray(result.strengths) ? result.strengths : []
    const overallScore = result.overall_score ?? 70

    const primaryShot = shotTypes?.[0] ?? null
    const sessionTitle =
      typeof titleInput === 'string' && normalizeReelTitle(titleInput)
        ? normalizeReelTitle(titleInput)
        : defaultReelTitle(primaryShot)

    const { data: session, error } = await supabase
      .from('analysis_sessions')
      .insert({
        user_id: user.id,
        player_id: resolvedPlayerId,
        lesson_id: lessonId || null,
        sport: sport || 'tennis',
        title: sessionTitle,
        shot_type: shotTypes?.length ? shotTypes.join(', ') : null,
        overall_score: overallScore,
        top_issue: result.top_issue || null,
        biggest_win: result.biggest_win || null,
        critical_count: issues.filter(i => i.severity === 'critical').length,
        moderate_count: issues.filter(i => i.severity === 'moderate').length,
        minor_count: issues.filter(
          i => i.severity !== 'critical' && i.severity !== 'moderate',
        ).length,
        strengths_count: strengths.length,
        rating: overallScore >= 75 ? 'good' : 'needs_work',
        source: 'text',
        coach_verified: false,
        published_to_player: !lessonId,
        full_result: result,
        analyzed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Session save error:', error)
    }

    const { data: usageProfile } = await supabase
      .from('profiles')
      .select('analyses_used')
      .eq('id', user.id)
      .maybeSingle()

    await supabase
      .from('profiles')
      .update({ analyses_used: (usageProfile?.analyses_used ?? 0) + 1 })
      .eq('id', user.id)

    return NextResponse.json({
      ...result,
      sessionId: session?.id,
      session_id: session?.id,
      source: 'text',
    })
  } catch (e) {
    console.error('Text analysis error:', e)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
