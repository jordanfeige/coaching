import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { assertUserOwnsChunk } from '@/lib/film-room/match-auth'
import { archiveWorkOnItem } from '@/lib/film-room/work-on-state'

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

  const { matchChunkId, workOnRank } = await req.json()

  if (!matchChunkId || ![1, 2, 3].includes(workOnRank)) {
    return NextResponse.json(
      { error: 'matchChunkId and workOnRank (1-3) required' },
      { status: 400 },
    )
  }

  const auth = await assertUserOwnsChunk(supabase, user, matchChunkId)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const result = await archiveWorkOnItem(matchChunkId, workOnRank)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true })
}
