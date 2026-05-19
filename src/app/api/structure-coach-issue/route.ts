import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI is not configured' }, { status: 500 })
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Coach access required' }, { status: 403 })
  }

  const { description, severity, sport } = await req.json()

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description required' }, { status: 400 })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: `You are a sports technique coach.
Structure a coach's observation into a technique issue.
Respond with JSON only:
{
  "area": "short issue name (2-4 words)",
  "explanation": "clear explanation of the issue",
  "biomechanical_impact": "downstream consequence",
  "drill": "specific drill name to fix it",
  "drill_instructions": "2-3 sentence drill description",
  "sets_reps": "e.g. 3 sets · 15 reps"
}`,
      messages: [
        {
          role: 'user',
          content: `Sport: ${sport || 'tennis'}
Severity: ${severity || 'moderate'}
Coach observed: "${description}"`,
        },
      ],
    })

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    return NextResponse.json(JSON.parse(text))
  } catch {
    return NextResponse.json({
      area: String(description).split(' ').slice(0, 3).join(' '),
      explanation: description,
      drill: 'Coach-prescribed drill',
      sets_reps: '3 sets · 15 reps',
    })
  }
}
