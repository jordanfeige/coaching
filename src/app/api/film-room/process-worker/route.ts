import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getWorkerSecret } from '@/lib/film-room/app-url'
import { runMatchProcessing } from '@/lib/film-room/run-match-processing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 800

export async function POST(req: Request) {
  const secret = req.headers.get('x-worker-secret')
  if (!secret || secret !== getWorkerSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const matchId = body.matchId as string
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdminClient()

  try {
    const { chunkCount } = await runMatchProcessing(matchId, supabaseAdmin)
    return NextResponse.json({ success: true, matchId, chunkCount })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pipeline failed'
    console.error('[film-room/process-worker] Pipeline failed:', err)

    await supabaseAdmin
      .from('matches')
      .update({ status: 'failed', status_error: message })
      .eq('id', matchId)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
