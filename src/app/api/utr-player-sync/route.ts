import { NextRequest, NextResponse } from 'next/server'
import { userCanManagePlayer } from '@/lib/linked-player'
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

    const canManage = await userCanManagePlayer(authSupabase, user.id, playerId)
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  if (action === 'unlink') {
    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId required' },
        { status: 400 },
      )
    }

    const canManageUnlink = await userCanManagePlayer(
      authSupabase,
      user.id,
      playerId,
    )
    if (!canManageUnlink) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const { error: playerError } = await admin
        .from('players')
        .update({
          utr_player_id: null,
          utr_singles: null,
          utr_doubles: null,
          utr_status: null,
          utr_last_synced: null,
        })
        .eq('id', playerId)

      if (playerError) {
        return NextResponse.json(
          { success: false, error: playerError.message },
          { status: 500 },
        )
      }

      const { data: profile } = await admin
        .from('recruiting_profiles')
        .select('id')
        .eq('player_id', playerId)
        .maybeSingle()

      if (profile?.id) {
        const { error: profileError } = await admin
          .from('recruiting_profiles')
          .update({
            utr_player_id: null,
            utr_singles: null,
            utr_doubles: null,
            utr_status: null,
            utr_display_name: null,
            schedule_strength_score: null,
            schedule_avg_opponent_utr: null,
            schedule_highest_utr_beaten: null,
            schedule_quality_wins: null,
            schedule_win_rate_vs_higher: null,
            schedule_sanctioned_pct: null,
            schedule_total_matches: null,
            schedule_summary: null,
            schedule_last_calculated: null,
            last_synced_at: null,
          })
          .eq('id', profile.id)

        if (profileError) {
          return NextResponse.json(
            { success: false, error: profileError.message },
            { status: 500 },
          )
        }
      }

      return NextResponse.json({
        success: true,
        unlinked: true,
      })
    } catch (e) {
      console.error('[utr-player-sync] unlink failed:', e)
      return NextResponse.json(
        {
          success: false,
          error: e instanceof Error ? e.message : 'UTR unlink failed',
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

    const canManageSync = await userCanManagePlayer(
      authSupabase,
      user.id,
      playerId,
    )
    if (!canManageSync) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
