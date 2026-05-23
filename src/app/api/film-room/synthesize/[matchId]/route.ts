import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { assertUserOwnsMatch } from '@/lib/film-room/match-auth'
import {
  chunksIncludedMatch,
  synthesizeMatch,
} from '@/lib/film-room/vertex-synthesizer'
import type { MatchSynthesisV1 } from '@/lib/match-analysis/synthesis-types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

async function loadSynthesisContext(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  matchId: string,
) {
  const { data: chunks } = await supabase
    .from('match_chunks')
    .select('sequence_number, analysis_status')
    .eq('match_id', matchId)
    .order('sequence_number', { ascending: true })

  const all = chunks ?? []
  const analyzed = all.filter(c => c.analysis_status === 'analyzed')
  const analyzedSeqs = analyzed.map(c => c.sequence_number)

  const { data: latest } = await supabase
    .from('match_syntheses')
    .select('id, chunks_included, synthesis_result, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const cacheHit =
    Boolean(latest) &&
    chunksIncludedMatch(latest!.chunks_included as number[], analyzedSeqs)

  return {
    totalChunks: all.length,
    analyzedCount: analyzed.length,
    analyzedSeqs,
    latest,
    cacheHit,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isFilmRoomEnabled(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { matchId } = await params
  const auth = await assertUserOwnsMatch(supabase, user, matchId)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const ctx = await loadSynthesisContext(supabase, matchId)

  if (ctx.analyzedCount < 2) {
    return NextResponse.json({
      synthesis: null,
      cacheHit: false,
      analyzedCount: ctx.analyzedCount,
      totalChunks: ctx.totalChunks,
      chunksIncluded: ctx.analyzedSeqs,
    })
  }

  return NextResponse.json({
    synthesis: ctx.cacheHit
      ? (ctx.latest!.synthesis_result as MatchSynthesisV1)
      : null,
    synthesisId: ctx.cacheHit ? ctx.latest!.id : null,
    cacheHit: ctx.cacheHit,
    analyzedCount: ctx.analyzedCount,
    totalChunks: ctx.totalChunks,
    chunksIncluded: ctx.analyzedSeqs,
  })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isFilmRoomEnabled(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { matchId } = await params
  const auth = await assertUserOwnsMatch(supabase, user, matchId)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const result = await synthesizeMatch(matchId)
    const ctx = await loadSynthesisContext(supabase, matchId)

    return NextResponse.json({
      synthesis: result.synthesis,
      synthesisId: result.synthesisId,
      cacheHit: result.cacheHit,
      analyzedCount: ctx.analyzedCount,
      totalChunks: ctx.totalChunks,
      chunksIncluded: result.chunksIncluded,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Synthesis failed'
    const status = message.includes('Not enough') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
