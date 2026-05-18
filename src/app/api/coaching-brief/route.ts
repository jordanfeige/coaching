import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { context } = await req.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { brief: "Review your roster for score drops first, then use shared issues to plan this week's group drills." },
      { status: 200 },
    )
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const prompt = `You are a coaching analytics assistant for Playvia,
an AI sports coaching platform. A coach has just opened their Pulse
dashboard. Write a concise 2-3 sentence coaching brief in plain
conversational English that tells them exactly what to focus on today.

Here is their roster data:
${JSON.stringify(context, null, 2)}

Rules:
- Be specific - use player names, scores, and issue names
- Tell them what ACTION to take, not just what the data shows
- Prioritize: 1) players regressing, 2) shared issues for group work,
  3) players ready to advance
- Write in second person ("You have..." "Consider...")
- Maximum 3 sentences - coaches are busy
- Do not use bullet points — flowing sentences only
- Sound like a knowledgeable colleague, not a robot
- If there are no issues or all players are doing well, say so positively

Return ONLY the brief text - no labels, no formatting, no preamble.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const brief = message.content[0]?.type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ brief })
  } catch (error) {
    console.error('Could not generate coaching brief:', error)
    return NextResponse.json(
      { brief: "Start with any player whose score has dropped, then turn the most common roster issue into this week's group session focus." },
      { status: 200 },
    )
  }
}
