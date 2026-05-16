import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SPORT_CONTEXTS: Record<string, string> = {
  tennis: 'tennis coaching session on a tennis court',
  golf: 'golf lesson on a driving range or golf course',
  pickleball: 'pickleball lesson on indoor or outdoor pickleball courts',
  basketball: 'basketball practice session on a court',
}

function normalizeSportForPlan(s: string): string {
  const k = (s || 'tennis').toLowerCase()
  return k === 'baseball' ? 'pickleball' : k
}

export async function POST(req: NextRequest) {
  const {
    playerName, age, skillLevel, focuses, lessonTypes,
    duration, workOn, sport = 'tennis'
  } = await req.json()

  const sportNorm = normalizeSportForPlan(String(sport))
  const context = SPORT_CONTEXTS[sportNorm] || SPORT_CONTEXTS.tennis

  const prompt = `You are an expert ${sportNorm} coach. Generate a detailed lesson plan for a ${context}.

Player: ${playerName}
Age: ${age || 'unknown'}
Skill level: ${skillLevel}
Lesson duration: ${duration} minutes
Primary focuses: ${focuses?.join(', ')}
Lesson types: ${lessonTypes?.join(', ')}
What to work on most: ${workOn}

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "drills": [
    {
      "title": "drill name",
      "duration_mins": 10,
      "description": "detailed instructions for the coach",
      "coaching_cues": ["cue 1", "cue 2"],
      "equipment": ["item 1"]
    }
  ],
  "total_mins": ${duration},
  "summary": "one sentence summary of the session goal"
}`

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (e: any) {
    console.error('Drills API error:', e?.message)
    return NextResponse.json({ error: e?.message || 'Failed to generate drills' }, { status: 500 })
  }
}