import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, full_name, phone, player_ids } = await req.json()
  const playerIds = Array.isArray(player_ids) ? player_ids.filter(Boolean) : []

  if (!email || !full_name || playerIds.length === 0) {
    return NextResponse.json({ error: 'Full name, email, and at least one player required' }, { status: 400 })
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
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

    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      full_name: String(full_name).trim(),
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

    return NextResponse.json({ success: true, account_id: userId })
  } catch (e: unknown) {
    console.error('Account create error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Account creation failed' }, { status: 500 })
  }
}
