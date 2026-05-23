import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { assertUserOwnsMatch } from '@/lib/film-room/match-auth'
import { formatMatchDate } from '@/lib/film-room/format'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; sequenceNumber: string }> },
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

  const { id: matchId, sequenceNumber: seqStr } = await params
  const sequenceNumber = Number(seqStr)
  if (!Number.isFinite(sequenceNumber)) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 })
  }

  const auth = await assertUserOwnsMatch(supabase, user, matchId)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: match } = await supabase
    .from('matches')
    .select('id, opponent_name, match_date, created_at')
    .eq('id', matchId)
    .single()

  const { data: chunk } = await supabase
    .from('match_chunks')
    .select('*')
    .eq('match_id', matchId)
    .eq('sequence_number', sequenceNumber)
    .single()

  if (!match || !chunk) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (chunk.analysis_status !== 'analyzed' || !chunk.analysis_result) {
    return NextResponse.json(
      { error: 'Segment not analyzed yet' },
      { status: 400 },
    )
  }

  let archivedRanks: Array<1 | 2 | 3> = []
  const { data: workOnStates, error: stateErr } = await supabase
    .from('match_chunk_work_on_state')
    .select('work_on_rank, archived_at')
    .eq('match_chunk_id', chunk.id)
    .not('archived_at', 'is', null)

  if (!stateErr) {
    archivedRanks = (workOnStates ?? []).map(s => s.work_on_rank as 1 | 2 | 3)
  }

  return NextResponse.json({
    matchId,
    chunkId: chunk.id,
    sequenceNumber: chunk.sequence_number,
    startSeconds: chunk.start_seconds,
    endSeconds: chunk.end_seconds,
    opponentName: match.opponent_name,
    dateLabel: formatMatchDate(match.match_date, match.created_at),
    analysis: chunk.analysis_result as MatchAnalysisV2,
    archivedRanks,
  })
}
