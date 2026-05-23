import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { assertUserOwnsChunk, assertUserOwnsMatch } from '@/lib/film-room/match-auth'
import { findDrillsForWorkOn } from '@/lib/film-room/drill-matching'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
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

  const url = new URL(req.url)
  const matchChunkId = url.searchParams.get('matchChunkId')
  const matchId = url.searchParams.get('matchId')
  const workOnTitleParam = url.searchParams.get('workOnTitle')
  const workOnRank = Number(url.searchParams.get('workOnRank'))

  let title: string
  let interpretation: string | undefined

  if (matchChunkId && [1, 2, 3].includes(workOnRank)) {
    const auth = await assertUserOwnsChunk(supabase, user, matchChunkId)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

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
    interpretation = workOn.interpretation
  } else if (matchId && workOnTitleParam?.trim()) {
    const auth = await assertUserOwnsMatch(supabase, user, matchId)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    title = workOnTitleParam.trim()
    interpretation = undefined
  } else {
    return NextResponse.json(
      { error: 'matchChunkId+workOnRank or matchId+workOnTitle required' },
      { status: 400 },
    )
  }

  const drills = await findDrillsForWorkOn(supabase, {
    title,
    interpretation,
  })

  return NextResponse.json({
    workOnTitle: title,
    drills: drills.map(d => ({
      id: d.id,
      name: d.name,
      primary_category: d.primary_category,
      duration_minutes: d.duration_minutes,
      description: d.description,
      steps: d.steps,
      source_attribution: d.source_attribution,
      coaching_cue: d.coaching_cue,
    })),
  })
}
