import { NextRequest, NextResponse } from 'next/server'
import { runPlayerUTRSync, searchUTRPlayers } from '@/lib/utr'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const authSupabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const body = await req.json()
  const { action, query, utrPlayerId, playerId } = body as {
    action?: string
    query?: string
    utrPlayerId?: string
    playerId?: string
  }

  if (action === 'search') {
    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }
    try {
      const players = await searchUTRPlayers(query)
      return NextResponse.json({ success: true, players })
    } catch (e) {
      console.error('[utr-player-sync] search failed:', e)
      const message =
        e instanceof Error ? e.message : 'UTR search failed'
      return NextResponse.json(
        { success: false, error: message, players: [] },
        { status: 500 },
      )
    }
  }

  if (action === 'link') {
    if (!utrPlayerId || !playerId) {
      return NextResponse.json(
        { error: 'utrPlayerId and playerId required' },
        { status: 400 },
      )
    }

    try {
      const syncResult = await runPlayerUTRSync(
        admin,
        playerId,
        String(utrPlayerId),
      )

      if ('error' in syncResult && syncResult.error) {
        return NextResponse.json({
          success: false,
          error: syncResult.error,
        })
      }

      return NextResponse.json({
        success: true,
        linked: true,
        ...syncResult,
      })
    } catch (e) {
      console.error('[utr-player-sync] link failed:', e)
      return NextResponse.json(
        {
          success: false,
          error: e instanceof Error ? e.message : 'UTR link failed',
        },
        { status: 500 },
      )
    }
  }

  if (action === 'sync') {
    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId required' },
        { status: 400 },
      )
    }

    const { data: player } = await admin
      .from('players')
      .select('utr_player_id, name')
      .eq('id', playerId)
      .single()

    if (!player?.utr_player_id) {
      return NextResponse.json({
        success: false,
        error: 'Player not linked to UTR yet.',
        needsLinking: true,
      })
    }

    try {
      const syncResult = await runPlayerUTRSync(
        admin,
        playerId,
        player.utr_player_id,
      )

      if ('error' in syncResult && syncResult.error) {
        return NextResponse.json({
          success: false,
          error: syncResult.error,
        })
      }

      return NextResponse.json({
        success: true,
        ...syncResult,
      })
    } catch (e) {
      console.error('[utr-player-sync] sync failed:', e)
      return NextResponse.json(
        {
          success: false,
          error: e instanceof Error ? e.message : 'UTR sync failed',
        },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
