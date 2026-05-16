import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, player_id } = await req.json()

  if (!email || !player_id) {
    return NextResponse.json({ error: 'Email and player_id required' }, { status: 400 })
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
      user_metadata: { player_id, role: 'player' },
    })

    if (createError && !createError.message.includes('already been registered')) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const userId = userData?.user?.id

    if (userId) {
      // Link profile to player
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email,
        role: 'player',
        player_id,
      })
    }

    // Generate a magic link they can use to log in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tennis-coach-vert.vercel.app'}/auth/set-password`,
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

  } catch (e: any) {
    console.error('Invite error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}