import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

const SYSTEM_PROMPT = `You are Via, an AI coaching agent for Playvia.
Write a personal coaching debrief directly to the player
or their parent. Use their first name. Be specific —
reference actual scores, angle improvements, and issues
by name. Be motivating but honest. Max 3 sentences.
No bullet points. No generic phrases like "great work"
— say exactly what improved and what's next.
Never mention JSON, data, or technical terms.`

type PlayerContext = {
  name?: string
  sport?: string
  latestScore?: number | null
  previousScore?: number | null
  delta?: number | null
  totalGain?: number
  topIssue?: string | null
  sessionCount?: number
  strengths?: unknown[]
  issues?: unknown[]
  poseMeasurements?: unknown
  daysSinceLast?: number | null
  hasUpcomingLesson?: boolean
  recentDrill?: string | null
}

type LegacyPlayer = {
  name?: string | null
  sport?: string | null
  skill_level?: string | null
}

type LegacySession = {
  overall_score?: number | null
  top_issue?: string | null
  biggest_win?: string | null
  full_result?: {
    strengths?: unknown[]
    areas_to_improve?: Array<{ area?: string }>
  } | null
}

function buildContextFromLegacy(
  player?: LegacyPlayer,
  sessions?: LegacySession[],
): PlayerContext {
  const safeSessions = Array.isArray(sessions) ? sessions : []
  const latest = safeSessions[safeSessions.length - 1]
  const previous = safeSessions[safeSessions.length - 2]
  const first = safeSessions[0]

  const latestScore = latest?.overall_score ?? null
  const previousScore = previous?.overall_score ?? null
  const delta =
    typeof latestScore === 'number' && typeof previousScore === 'number'
      ? latestScore - previousScore
      : null
  const totalGain =
    latest &&
    first &&
    latest !== first &&
    typeof latestScore === 'number' &&
    typeof first.overall_score === 'number'
      ? latestScore - first.overall_score
      : 0

  return {
    name: player?.name?.split(' ')[0] || player?.name || undefined,
    sport: player?.sport || undefined,
    latestScore,
    previousScore,
    delta,
    totalGain,
    topIssue: latest?.top_issue ?? null,
    sessionCount: safeSessions.length,
    strengths: latest?.full_result?.strengths || [],
    issues: latest?.full_result?.areas_to_improve || [],
    daysSinceLast: null,
  }
}

function fallbackSummary(ctx: PlayerContext): string {
  const name = ctx.name || 'there'
  if (!ctx.sessionCount || ctx.latestScore == null) {
    return `${name}, upload your first video and I will break down your technique with exact joint angles and a clear plan for what to fix first.`
  }
  const deltaPart =
    ctx.delta != null && ctx.delta !== 0
      ? ` Your score ${ctx.delta > 0 ? 'rose' : 'dropped'} ${Math.abs(ctx.delta)} points since your last session.`
      : ''
  const issuePart = ctx.topIssue
    ? ` Next up: tighten ${ctx.topIssue}.`
    : ' Keep filming the same shot so we can track what changes.'
  return `${name}, you're at ${ctx.latestScore} overall.${deltaPart}${issuePart}`
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    playerContext?: PlayerContext
    player?: LegacyPlayer
    sessions?: LegacySession[]
  }

  const playerContext: PlayerContext =
    body.playerContext && typeof body.playerContext === 'object'
      ? body.playerContext
      : buildContextFromLegacy(body.player, body.sessions)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ summary: fallbackSummary(playerContext) })
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 220,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Write the debrief using this player context:\n\n${JSON.stringify(playerContext, null, 2)}`,
        },
      ],
    })

    const summary =
      message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

    return NextResponse.json({
      summary: summary || fallbackSummary(playerContext),
    })
  } catch (error) {
    console.error('Player summary failed:', error)
    return NextResponse.json({ summary: fallbackSummary(playerContext) })
  }
}
