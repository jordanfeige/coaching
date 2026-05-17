import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type ChatMessage = {
  role?: string
  content?: string
}

type PlayerContext = {
  id?: string
  name?: string
  sport?: string | null
  skill_level?: string | null
  age?: number | null
}

type VideoContext = {
  id: string
  title?: string | null
  recorded_at?: string | null
  player_id?: string | null
  lesson_id?: string | null
  ai_analysis?: unknown
  players?: PlayerContext | PlayerContext[] | null
}

type LessonContext = {
  id: string
  player_id?: string | null
  starts_at?: string | null
  duration_mins?: number | null
  status?: string | null
  published_at?: string | null
  notes?: string | null
  players?: PlayerContext | PlayerContext[] | null
}

type DrillContext = {
  title?: string | null
  description?: string | null
  steps?: unknown
}

type JournalEntryContext = {
  content?: string | null
  created_at?: string | null
}

const RETIRED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'models/gemini-2.0-flash',
])

function coachChatModelId() {
  const configured = process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_MODEL
  const model = configured?.trim()
  return model && !RETIRED_GEMINI_MODELS.has(model) ? model : 'gemini-2.5-flash'
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function compactJson(value: unknown, max = 8000) {
  try {
    return JSON.stringify(value ?? {}, null, 2).slice(0, max)
  } catch {
    return '{}'
  }
}

function normalizeMessages(messages: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(messages)) return []
  return messages
    .map((message: ChatMessage) => ({
      role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: typeof message.content === 'string' ? message.content.trim() : '',
    }))
    .filter(message => message.content)
    .slice(-8)
}

function parseAnalysis(value: unknown) {
  if (!value) return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }

  const { videoId, lessonId, messages } = await req.json()
  const chatMessages = normalizeMessages(messages)
  const latestQuestion = chatMessages[chatMessages.length - 1]?.content
  if (!latestQuestion) {
    return NextResponse.json({ error: 'A question is required' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()
  const isCoach = profile?.role === 'coach'

  let video: VideoContext | null = null
  let lesson: LessonContext | null = null
  let player: PlayerContext | null = null
  let drills: DrillContext[] = []
  let entries: JournalEntryContext[] = []

  if (typeof videoId === 'string' && videoId) {
    const { data } = await supabase
      .from('videos')
      .select('id, title, recorded_at, player_id, lesson_id, ai_analysis, players(id, name, sport, skill_level, age)')
      .eq('id', videoId)
      .maybeSingle()
    video = data as VideoContext | null
    player = firstRelation(video?.players)
  }

  const resolvedLessonId =
    typeof lessonId === 'string' && lessonId
      ? lessonId
      : typeof video?.lesson_id === 'string'
        ? video.lesson_id
        : null

  if (resolvedLessonId) {
    const { data } = await supabase
      .from('lessons')
      .select('id, player_id, starts_at, duration_mins, status, published_at, notes, players(id, name, sport, skill_level, age)')
      .eq('id', resolvedLessonId)
      .maybeSingle()
    lesson = data as LessonContext | null
    player = player ?? firstRelation(lesson?.players)
  }

  if (!video && !lesson) {
    return NextResponse.json({ error: 'Could not find video or lesson context' }, { status: 404 })
  }

  if (!isCoach && lesson && !lesson.published_at) {
    return NextResponse.json({ error: 'This lesson recap has not been published yet' }, { status: 403 })
  }

  if (lesson?.id) {
    const [{ data: lessonDrills }, { data: lessonEntries }] = await Promise.all([
      supabase.from('drills').select('title, description, steps').eq('lesson_id', lesson.id),
      supabase.from('journal_entries').select('content, created_at').eq('lesson_id', lesson.id).order('created_at', { ascending: false }),
    ])
    drills = (lessonDrills ?? []) as DrillContext[]
    entries = (lessonEntries ?? []) as JournalEntryContext[]
  }

  const analysis = parseAnalysis(video?.ai_analysis)
  const sport = String(player?.sport || 'tennis')
  const conversation = chatMessages
    .map(message => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n')

  const prompt = `You are Playvia Coach AI, a specific, practical ${sport} coach answering follow-up questions about a saved lesson/video analysis.

Rules:
- Answer ONLY from the provided analysis, lesson notes, drills, and visible-media-derived observations.
- If the user asks about an outcome like ball flight, loft, spin, slice, or contact quality, infer from the saved mechanics only and say what is inferred.
- Be concise but useful: direct answer first, then why, then drills or cues.
- Give measurable targets when possible: degrees, inches, reps, time, or success criteria.
- Do not claim you rewatched the video live. You are using the saved analysis context.
- If the saved context is insufficient, say what camera angle or missing detail would confirm it, then still give the best likely coaching answer.

Player:
${compactJson(player, 1200)}

Lesson:
${compactJson(lesson, 1600)}

Video:
${compactJson(video ? { id: video.id, title: video.title, recorded_at: video.recorded_at } : null, 1000)}

Saved AI analysis:
${compactJson(analysis, 9000)}

Coach notes:
${compactJson(entries, 3000)}

Assigned drills:
${compactJson(drills, 3000)}

Conversation:
${conversation}

Answer the latest user question in plain English. Use short sections only if helpful.`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: coachChatModelId(),
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1400,
      },
    })
    const result = await model.generateContent(prompt)
    const answer = result.response.text().trim()
    return NextResponse.json({ answer })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Coach chat failed'
    console.error('[coach-chat]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
