import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

type SummarySession = {
  overall_score?: number | null
  rating?: string | null
  top_issue?: string | null
  biggest_win?: string | null
  full_result?: {
    areas_to_improve?: Array<{ area?: string }>
  } | null
}

type SummaryPlayer = {
  name?: string | null
  sport?: string | null
  skill_level?: string | null
}

export async function POST(req: NextRequest) {
  const { player, sessions } = (await req.json()) as {
    player?: SummaryPlayer
    sessions?: SummarySession[]
  }
  const safeSessions = Array.isArray(sessions) ? sessions : []

  const firstScore = safeSessions[0]?.overall_score ?? null
  const latestScore = safeSessions[safeSessions.length - 1]?.overall_score ?? null
  const totalGain =
    typeof latestScore === 'number' && typeof firstScore === 'number'
      ? latestScore - firstScore
      : 0

  const issueCounts: Record<string, number> = {}
  safeSessions.forEach(session => {
    session.full_result?.areas_to_improve?.forEach(issue => {
      if (issue.area) issueCounts[issue.area] = (issueCounts[issue.area] || 0) + 1
    })
  })
  const persistentIssues = Object.entries(issueCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([issue]) => issue)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      summary: `${player?.name || 'This athlete'} has ${safeSessions.length} tracked session${safeSessions.length === 1 ? '' : 's'} with a latest score of ${latestScore ?? 'no score yet'}. ${totalGain ? `Their score has changed by ${totalGain > 0 ? '+' : ''}${totalGain} points. ` : ''}${persistentIssues[0] ? `${persistentIssues[0]} remains the main trend to coach next.` : 'Keep building baseline data before drawing strong trends.'}`,
    })
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const prompt = `Write a 3-4 sentence coaching summary for this athlete.
Be specific, use their name, reference actual scores and issues.
Sound like a knowledgeable coach reviewing a player's file.

Player: ${player?.name || 'Athlete'}
Sport: ${player?.sport || 'unknown'}
Skill level: ${player?.skill_level || 'unknown'}
Total sessions: ${safeSessions.length}
First score: ${firstScore ?? 'none'}
Latest score: ${latestScore ?? 'none'}
Total improvement: ${totalGain > 0 ? '+' : ''}${totalGain} points
Latest rating: ${safeSessions[safeSessions.length - 1]?.rating || 'none'}
Persistent issues (2+ sessions): ${persistentIssues.join(', ') || 'none'}
Latest top issue: ${safeSessions[safeSessions.length - 1]?.top_issue || 'none'}
Latest biggest win: ${safeSessions[safeSessions.length - 1]?.biggest_win || 'none'}

Rules:
- 3-4 sentences only
- Use player's first name
- Reference specific scores and improvement
- Mention what's working and what still needs work
- End with a forward-looking coaching note
- No bullet points - flowing paragraph only`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = message.content[0]?.type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Player summary failed:', error)
    return NextResponse.json({
      summary: `${player?.name || 'This athlete'} has ${safeSessions.length} tracked session${safeSessions.length === 1 ? '' : 's'} with a latest score of ${latestScore ?? 'no score yet'}. ${persistentIssues[0] ? `${persistentIssues[0]} is the main pattern to keep coaching.` : 'Keep collecting sessions to identify clearer trends.'}`,
    })
  }
}
