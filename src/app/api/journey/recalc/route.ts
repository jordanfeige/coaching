import { NextRequest, NextResponse } from 'next/server'
import { recalcJourneyRating } from '@/lib/journey-recalc'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
  }

  let body: { playerId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  try {
    const breakdown = await recalcJourneyRating(
      body.playerId,
      supabaseUrl,
      serviceKey,
    )
    return NextResponse.json({
      playerId: body.playerId,
      total: breakdown.total,
      tier: breakdown.tier,
      tier_progress: breakdown.tier_progress,
      weights_version: breakdown.weights_version,
    })
  } catch (e) {
    console.error(`Recalc failed for ${body.playerId}:`, e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Recalc failed' },
      { status: 500 },
    )
  }
}
