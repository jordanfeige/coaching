import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    if (userId) {
      // Link profile to the first player for legacy reads, and to all selected players for family accounts.
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email,
        full_name: typeof full_name === 'string' && full_name.trim() ? full_name.trim() : null,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        role: 'player',
        player_id: playerIds[0],
      })
      await supabaseAdmin.from('account_players').upsert(
        playerIds.map((playerId: string) => ({
          account_id: userId,
          player_id: playerId,
        })),
        { onConflict: 'account_id,player_id' }
      )
    }

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

    // Return the magic link so coach can share it manually
    return NextResponse.json({
      success: true,
      magic_link: linkData?.properties?.action_link,
    })

  } catch (e: unknown) {
    console.error('Invite error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invite failed' }, { status: 500 })
  }
}