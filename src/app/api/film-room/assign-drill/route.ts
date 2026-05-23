import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { assertUserOwnsChunk, assertUserOwnsMatch } from '@/lib/film-room/match-auth'
import { assignLibraryDrillToPlayer } from '@/lib/assign-library-drill'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
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

  const body = await req.json()
  const matchChunkId = body.matchChunkId as string | undefined
  const matchId = body.matchId as string | undefined
  const workOnRank = body.workOnRank as number | undefined
  const workOnTitle = body.workOnTitle as string | undefined
  const drillLibraryId = body.drillLibraryId as string | undefined

  if (!drillLibraryId) {
    return NextResponse.json({ error: 'drillLibraryId required' }, { status: 400 })
  }

  let playerId: string
  let title: string
  let chunkId: string | undefined
  let filmMatchId: string | undefined

  if (matchChunkId) {
    if (![1, 2, 3].includes(workOnRank ?? 0)) {
      return NextResponse.json({ error: 'workOnRank must be 1, 2, or 3' }, { status: 400 })
    }
    const auth = await assertUserOwnsChunk(supabase, user, matchChunkId)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    playerId = auth.playerId
    chunkId = matchChunkId

    const { data: chunk } = await supabase
      .from('match_chunks')
      .select('analysis_result')
      .eq('id', matchChunkId)
      .single()

    const analysis = chunk?.analysis_result as MatchAnalysisV2 | null
    const workOn = analysis?.work_on_top_three?.find(w => w.rank === workOnRank)
    if (!workOn) {
      return NextResponse.json({ error: 'Work-on item not found' }, { status: 404 })
    }
    title = workOn.title
  } else if (matchId && workOnTitle?.trim()) {
    const auth = await assertUserOwnsMatch(supabase, user, matchId)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    playerId = auth.playerId
    filmMatchId = matchId
    title = workOnTitle.trim()
  } else {
    return NextResponse.json(
      { error: 'matchChunkId+workOnRank or matchId+workOnTitle required' },
      { status: 400 },
    )
  }

  const result = await assignLibraryDrillToPlayer(supabase, playerId, {
    libraryDrillId: drillLibraryId,
    filmRoomMatchChunkId: chunkId,
    filmRoomMatchId: filmMatchId,
    filmRoomWorkOnTitle: title,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, drillId: result.drillId })
}
