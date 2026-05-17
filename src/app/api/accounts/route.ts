import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Player = { id: string; name: string; age?: number | null; email?: string | null }

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireCoach() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', status: 401 as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'coach') return { error: 'Not authorized', status: 403 as const }
  return { user }
}

export async function GET() {
  const auth = await requireCoach()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const supabaseAdmin = adminClient()
    const [{ data: profileRows, error: profilesError }, { data: playerRows, error: playersError }, { data: links, error: linksError }] =
      await Promise.all([
        supabaseAdmin.from('profiles').select('id, email, full_name, phone, role').eq('role', 'player').order('email'),
        supabaseAdmin.from('players').select('id, name, age, email').order('name'),
        supabaseAdmin.from('account_players').select('account_id, players(id, name, age, email)'),
      ])

    const error = profilesError || playersError || linksError
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const byAccount = new Map<string, Player[]>()
    for (const link of links ?? []) {
      const player = Array.isArray(link.players) ? link.players[0] : link.players
      if (!player?.id) continue
      const arr = byAccount.get(link.account_id) ?? []
      arr.push(player as Player)
      byAccount.set(link.account_id, arr)
    }

    return NextResponse.json({
      players: playerRows ?? [],
      accounts: (profileRows ?? []).map(profile => ({
        ...profile,
        players: byAccount.get(profile.id) ?? [],
      })),
    })
  } catch (e: unknown) {
    console.error('Account list error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Account list failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCoach()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { email, full_name, phone, player_ids } = await req.json()
  const playerIds = Array.isArray(player_ids) ? player_ids.filter(Boolean) : []
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail || !full_name || playerIds.length === 0) {
    return NextResponse.json({ error: 'Full name, email, and at least one player required' }, { status: 400 })
  }

  try {
    const supabaseAdmin = adminClient()

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
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
        .eq('email', normalizedEmail)
        .maybeSingle()
      userId = existingProfile?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Could not find or create account user' }, { status: 400 })
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: normalizedEmail,
      full_name: String(full_name).trim(),
      phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
      role: 'player',
      player_id: playerIds[0],
    })
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { error: linksError } = await supabaseAdmin.from('account_players').upsert(
      playerIds.map((playerId: string) => ({
        account_id: userId,
        player_id: playerId,
      })),
      { onConflict: 'account_id,player_id' }
    )
    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, account_id: userId })
  } catch (e: unknown) {
    console.error('Account create error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Account creation failed' }, { status: 500 })
  }
}
