import { NextRequest, NextResponse } from 'next/server'
import { updateJourneyInput } from '@/lib/journey-inputs'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_CATEGORIES = [
  'tennis',
  'academics',
  'exposure',
  'coachability',
] as const
type Category = (typeof VALID_CATEGORIES)[number]

interface RequestBody {
  playerId?: string
  category?: string
  inputKey?: string
  valueNumeric?: number | null
  valueText?: string | null
  unit?: string
  source?: string
  verified?: boolean
  actor?: string
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }
  if (!body.category || !VALID_CATEGORIES.includes(body.category as Category)) {
    return NextResponse.json(
      { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 },
    )
  }
  if (!body.inputKey) {
    return NextResponse.json({ error: 'inputKey required' }, { status: 400 })
  }
  if (!body.source) {
    return NextResponse.json({ error: 'source required' }, { status: 400 })
  }
  if (body.valueNumeric == null && body.valueText == null) {
    return NextResponse.json(
      { error: 'either valueNumeric or valueText required' },
      { status: 400 },
    )
  }

  try {
    await updateJourneyInput({
      playerId: body.playerId,
      category: body.category as Category,
      inputKey: body.inputKey,
      valueNumeric: body.valueNumeric ?? null,
      valueText: body.valueText ?? null,
      unit: body.unit,
      source: body.source,
      verified: body.verified ?? false,
      actor: body.actor ?? 'system',
      triggerRecalc: true,
    })

    return NextResponse.json({
      ok: true,
      playerId: body.playerId,
      category: body.category,
      inputKey: body.inputKey,
      message: 'Input updated, recalc fired',
    })
  } catch (e) {
    console.error('Input update failed:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 },
    )
  }
}
