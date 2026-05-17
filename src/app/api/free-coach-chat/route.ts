import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const RETIRED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'models/gemini-2.0-flash',
])

function modelId() {
  const configured = process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_MODEL
  const model = configured?.trim()
  return model && !RETIRED_GEMINI_MODELS.has(model) ? model : 'gemini-2.5-flash'
}

function compactJson(value: unknown, max = 9000) {
  try {
    return JSON.stringify(value ?? {}, null, 2).slice(0, max)
  } catch {
    return '{}'
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const { question, analysis, sport, shotType } = await req.json()
    const latestQuestion = typeof question === 'string' ? question.trim() : ''
    if (!latestQuestion) {
      return NextResponse.json({ error: 'A question is required' }, { status: 400 })
    }

    const prompt = `You are Playvia Coach AI, a practical ${sport || 'sports'} coach answering one follow-up question about a free technique report.

Rules:
- Answer ONLY from the provided report context.
- Be concise and conversational.
- Direct answer first, then why, then one drill or cue.
- Give measurable targets when the report supports them.
- Do not claim you rewatched the video live. You are using the saved report.

Sport: ${sport || 'unknown'}
Shot type: ${shotType || 'unknown'}

Technique report:
${compactJson(analysis)}

Question:
${latestQuestion}

Answer in plain English.`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelId(),
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 900,
      },
    })
    const result = await model.generateContent(prompt)
    return NextResponse.json({ answer: result.response.text().trim() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Coach chat failed'
    console.error('[free-coach-chat]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
