import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeCollegeMatches } from '@/lib/college-matching'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { playerId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
  }

  try {
    const matches = await computeCollegeMatches(
      body.playerId,
      supabaseUrl,
      serviceKey,
    )
    return NextResponse.json({ ok: true, count: matches.length })
  } catch (e) {
    console.error('[recompute-matches]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Recompute failed' },
      { status: 500 },
    )
  }
}
