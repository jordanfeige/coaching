import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function isMissingColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("Could not find the 'full_name' column") ||
    error?.message?.includes('schema cache')
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, role = 'player', sports = [] } = await req.json()
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedRole = role === 'coach' ? 'coach' : 'player'

    if (!normalizedEmail || !password || !fullName) {
      return NextResponse.json({ error: 'Full name, email, and password are required' }, { status: 400 })
    }

    const supabaseAdmin = adminClient()
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: normalizedRole,
        sports: Array.isArray(sports) ? sports : [],
      },
    })

    if (error) {
      const alreadyRegistered = error.message.toLowerCase().includes('already')
      return NextResponse.json(
        { error: alreadyRegistered ? 'An account already exists for this email. Please sign in.' : error.message },
        { status: alreadyRegistered ? 409 : 400 }
      )
    }

    const userId = data.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Could not create account' }, { status: 500 })
    }

    const profilePayload = {
      id: userId,
      email: normalizedEmail,
      full_name: String(fullName).trim() || null,
      role: normalizedRole,
      player_id: null,
    }
    let { error: profileError } = await supabaseAdmin.from('profiles').upsert(profilePayload)

    if (isMissingColumnError(profileError)) {
      const fallbackProfilePayload = {
        id: profilePayload.id,
        email: profilePayload.email,
        role: profilePayload.role,
        player_id: profilePayload.player_id,
      }
      const fallback = await supabaseAdmin.from('profiles').upsert(fallbackProfilePayload)
      profileError = fallback.error
    }

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Signup failed' },
      { status: 500 }
    )
  }
}
