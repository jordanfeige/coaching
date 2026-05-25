import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getWorkerSecret } from '@/lib/film-room/app-url'
import { runMatchProcessing } from '@/lib/film-room/run-match-processing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 800

export async function POST(req: Request) {
  let matchId: string | undefined

  try {
    const body = await req.json()
    matchId = body.matchId as string
    console.log('[worker] === STARTED ===', { matchId })

    const secret = req.headers.get('x-worker-secret')
    if (!secret || secret !== getWorkerSecret()) {
      console.log('[worker] Secret mismatch', {
        matchId,
        hasHeader: !!secret,
        headerLength: secret?.length ?? 0,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[worker] Auth passed, beginning chunk processing', { matchId })

    if (!matchId) {
      console.log('[worker] Missing matchId in body')
      return NextResponse.json({ error: 'matchId required' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    console.log('[worker] Calling runMatchProcessing', { matchId })
    const { chunkCount } = await runMatchProcessing(matchId, supabaseAdmin)
    console.log('[worker] === COMPLETE ===', { matchId, chunkCount })

    return NextResponse.json({ success: true, matchId, chunkCount })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pipeline failed'
    console.error('[worker] === FAILED ===', {
      matchId,
      message,
      stack: err instanceof Error ? err.stack : undefined,
    })

    if (matchId) {
      const supabaseAdmin = createSupabaseAdminClient()
      await supabaseAdmin
        .from('matches')
        .update({ status: 'failed', status_error: message })
        .eq('id', matchId)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
