import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

type PulseChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type PulseRosterContext = {
  currentPage?: string
}

export async function POST(req: NextRequest) {
  const { messages, rosterContext } = (await req.json()) as {
    messages?: PulseChatMessage[]
    rosterContext?: unknown
  }

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      response:
        "I can help once Anthropic is configured. For now, start with players whose scores dropped, then turn the most common roster issue into today's group drill.",
    })
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const currentPage =
    rosterContext && typeof rosterContext === 'object' && 'currentPage' in rosterContext
      ? String((rosterContext as PulseRosterContext).currentPage || 'dashboard')
      : 'dashboard'
  const pageDescription = currentPage.includes('analytics')
    ? 'Pulse analytics page'
    : currentPage.includes('players')
      ? 'Players page'
      : currentPage.includes('schedule')
        ? 'Schedule page'
        : currentPage.includes('video')
          ? 'Video page'
          : currentPage.includes('drills')
            ? 'Drills page'
            : 'main dashboard'

  const systemPrompt = `You are Via - Playvia's AI coaching assistant.
You are knowledgeable, direct, and action-oriented.
You speak like a trusted colleague, not a corporate bot.
Your name is Via. Sign your responses naturally - you don't
need to say "Via here" every time but occasionally refer to
yourself by name.
You have full context on the coach's roster.

ROSTER CONTEXT:
${JSON.stringify(rosterContext, null, 2)}

CURRENT PAGE: ${currentPage}
The coach is currently on the ${pageDescription}. Tailor your suggestions to be relevant to what they are currently doing.

YOUR CAPABILITIES:
You can help the coach take actions by returning structured
responses. When the coach asks to DO something, include an
action block at the end of your response.

AVAILABLE ACTIONS:
1. Schedule a lesson for a player
2. Generate a drill plan for a player or issue
3. View a specific player's profile
4. Analyze a player's video
5. Send a message to a player

ACTION FORMAT:
When an action is needed, end your response with a JSON block:
[ACTION:{"type":"schedule","playerId":"xxx","playerName":"Jordan"}]
[ACTION:{"type":"drill","playerId":"xxx","playerName":"Jordan","focus":"Follow Through"}]
[ACTION:{"type":"viewPlayer","playerId":"xxx","playerName":"Jordan"}]
[ACTION:{"type":"analyzeVideo","playerId":"xxx","playerName":"Jordan"}]

EXAMPLES:
User: "Schedule a lesson with Sarah"
Response: "Sure - let me open the scheduler for Sarah."
[ACTION:{"type":"schedule","playerId":"abc","playerName":"Sarah"}]

User: "Generate a drill plan for Marcus focusing on follow through"
Response: "I'll build a drill plan targeting Marcus's follow through issue."
[ACTION:{"type":"drill","playerId":"xyz","playerName":"Marcus","focus":"Follow Through"}]

User: "Who needs attention?"
Response: [answer in plain text, no action needed]

TONE: Direct, knowledgeable colleague. Under 100 words unless
asked for a detailed plan. Never use dashes for bullets.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Pulse chat failed:', error)
    return NextResponse.json({
      response:
        "I couldn't reach the coaching assistant right now. Use Pulse's attention list first, then build one group drill around the top shared issue.",
    })
  }
}
