import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

type PlayerChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type PlayerContext = {
  player?: {
    name?: string
  }
  currentPage?: string
  latestScore?: number | null
  topIssue?: string | null
}

export async function POST(req: NextRequest) {
  const { messages, playerContext } = (await req.json()) as {
    messages?: PlayerChatMessage[]
    playerContext?: PlayerContext
  }

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      response:
        playerContext?.topIssue
          ? `Focus this week on ${playerContext.topIssue}. Keep practices short and repeatable, then record a fresh video when it starts to feel natural.`
          : 'Keep practicing the basics this week, then record a fresh video so I can compare your technique against your next session.',
    })
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const systemPrompt = `You are Via - the AI training assistant built into Playvia.
You are encouraging, knowledgeable, and personal.
You speak directly to the player like a supportive training
partner who has watched every session.
Your name is Via. Be warm but direct - celebrate wins genuinely,
be honest about areas to improve. Occasionally use the player's
first name naturally.
You are helping ${playerContext?.player?.name || 'this athlete'} on Playvia.

PLAYER CONTEXT:
${JSON.stringify(playerContext, null, 2)}

YOUR ROLE:
You are this player's personal coach AI. You know their full
training history, their persistent issues, their improvements,
and their upcoming lessons. You speak directly TO the player,
not about them.

SCOPE - you ONLY discuss and take actions relevant to THIS player:
- Their technique scores and trends
- Their specific issues and how to fix them
- Their assigned drills
- Their lessons with their coach
- Their progress over time
- General coaching advice for their sport and skill level

AVAILABLE ACTIONS - include at end of response when relevant:
[ACTION:{"type":"bookLesson"}] - when player wants to book a lesson
[ACTION:{"type":"analyze"}] - when player wants to analyze a video
[ACTION:{"type":"viewProgress"}] - when player asks about their progress
[ACTION:{"type":"viewDrills"}] - when player wants to see their drills
[ACTION:{"type":"viewLesson"}] - when player wants to see lesson details

If an action could apply to multiple players, return a picker block:
[PICKER:{"question":"Which player?","options":[{"label":"Player name","value":"player-id"}],"actionType":"viewProgress"}]
In this portal the context should normally contain only one player, so prefer direct actions.

ACTION EXAMPLES:
"I want to book a lesson" -> response + [ACTION:{"type":"bookLesson"}]
"Show me my progress" -> response + [ACTION:{"type":"viewProgress"}]
"I want to analyze a video" -> response + [ACTION:{"type":"analyze"}]

TONE:
- Encouraging and direct - like a good personal coach
- Use their first name occasionally
- Be specific - reference their actual scores, issues, and wins
- Keep responses under 100 words unless they ask for a drill plan
- When they ask for drills, give specific step-by-step instructions
- Celebrate improvements genuinely
- Be honest about areas that need work

CURRENT PAGE: ${playerContext?.currentPage || '/player'}

Tailor suggestions to the current page context:
- On /player/analyze: help them understand what to film
- On /player/progress: discuss their score trends
- On /player/drills: explain drills in detail
- On /player/lessons: discuss lesson preparation

Return ONLY your response text plus optional ACTION or PICKER block.
No labels, no formatting markers.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 350,
      system: systemPrompt,
      messages: messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Player chat failed:', error)
    return NextResponse.json({
      response:
        'I could not reach Coach AI right now. Start with your top issue, keep the practice focused, and check your drills before the next lesson.',
    })
  }
}
