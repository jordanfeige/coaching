import { NextRequest, NextResponse } from 'next/server'
import { runPlayerUTRSync } from '@/lib/utr'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const maxDuration = 300

function isCronAuthorized(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  return Boolean(secret && authHeader === `Bearer ${secret}`)
}

async function runSyncAll() {
  const supabase = createSupabaseAdminClient()

  const { data: players } = await supabase
    .from('players')
    .select('id, utr_player_id, name')
    .not('utr_player_id', 'is', null)

  if (!players?.length) {
    return NextResponse.json({
      message: 'No linked players found',
    })
  }

  let synced = 0
  let failed = 0

  for (const player of players) {
    try {
      const result = await runPlayerUTRSync(
        supabase,
        player.id,
        player.utr_player_id!,
      )

      if ('error' in result && result.error) {
        failed++
      } else {
        synced++
      }

      await new Promise(r => setTimeout(r, 300))
    } catch (e: unknown) {
      console.error(
        `Sync failed ${player.name}:`,
        e instanceof Error ? e.message : e,
      )
      failed++
    }
  }

  return NextResponse.json({
    success: true,
    synced,
    failed,
    total: players.length,
  })
}

function requireCron(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const denied = requireCron(req)
  if (denied) return denied
  return runSyncAll()
}

export async function POST(req: NextRequest) {
  const denied = requireCron(req)
  if (denied) return denied
  return runSyncAll()
}
