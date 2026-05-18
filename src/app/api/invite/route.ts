import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createElement } from 'react'
import { PlayerInviteEmail } from '@/emails/PlayerInviteEmail'
import { sendEmail } from '@/lib/email'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function isMissingFullNameColumn(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("Could not find the 'full_name' column") ||
    error?.message?.includes('profiles.full_name') ||
    error?.message?.includes('schema cache')
  )
}

export async function POST(req: NextRequest) {
  const { email, full_name, phone, player_id, player_ids, redirect_path = '/player' } = await req.json()
  const playerIds = Array.isArray(player_ids)
    ? player_ids.filter(Boolean)
    : player_id
      ? [player_id]
      : []

  if (!email || playerIds.length === 0) {
    return NextResponse.json({ error: 'Email and at least one player required' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const coachName =
      typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : user?.email?.split('@')[0] || 'Your coach'

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // First create the user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      // role `player` = non-coach portal account (athlete or guardian — same profile shape)
      user_metadata: { player_id: playerIds[0], player_ids: playerIds, role: 'player', full_name, phone },
    })

    if (createError && !createError.message.includes('already been registered')) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    let userId = userData?.user?.id
    if (!userId) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      userId = existingProfile?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Could not find or create account user' }, { status: 400 })
    }

    // Link profile to the first player for legacy reads, and to all selected players for family accounts.
    const profilePayload = {
      id: userId,
      email,
      full_name: typeof full_name === 'string' && full_name.trim() ? full_name.trim() : null,
      phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
      role: 'player',
      player_id: playerIds[0],
    }
    let { error: profileError } = await supabaseAdmin.from('profiles').upsert(profilePayload)
    if (isMissingFullNameColumn(profileError)) {
      const fallbackProfilePayload = {
        id: profilePayload.id,
        email: profilePayload.email,
        phone: profilePayload.phone,
        role: profilePayload.role,
        player_id: profilePayload.player_id,
      }
      const fallback = await supabaseAdmin.from('profiles').upsert(fallbackProfilePayload)
      profileError = fallback.error
    }
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    await supabaseAdmin.from('account_players').upsert(
      playerIds.map((playerId: string) => ({
        account_id: userId,
        player_id: playerId,
      })),
      { onConflict: 'account_id,player_id' }
    )

    // Generate a magic link they can use to log in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tennis-coach-vert.vercel.app'}/auth/set-password?next=${encodeURIComponent(redirect_path)}`,
      }
    })

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    const { data: playerRow } = await supabaseAdmin
      .from('players')
      .select('sport')
      .eq('id', playerIds[0])
      .maybeSingle()
    const sport = playerRow?.sport || 'Tennis'
    const magicLink = linkData?.properties?.action_link

    if (magicLink) {
      await sendEmail({
        to: email,
        subject: `${coachName} invited you to Playvia`,
        template: createElement(PlayerInviteEmail, {
          coachName,
          sport,
          inviteUrl: magicLink,
        }),
        idempotencyKey: `player-invite/${email}/${playerIds.join('-')}`,
      })
    }

    // Return the magic link so coach can share it manually
    return NextResponse.json({
      success: true,
      magic_link: magicLink,
    })

  } catch (e: unknown) {
    console.error('Invite error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invite failed' }, { status: 500 })
  }
}