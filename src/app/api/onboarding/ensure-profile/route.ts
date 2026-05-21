import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { defaultBetaStatus } from '@/lib/beta-gate'
import { upsertProfileAdmin } from '@/lib/profile-upsert'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const role = body.role === 'coach' ? 'coach' : 'player'
  const email =
    typeof body.email === 'string' && body.email.trim()
      ? body.email.trim().toLowerCase()
      : user.email ?? ''
  const fullName =
    typeof body.full_name === 'string' && body.full_name.trim()
      ? body.full_name.trim()
      : typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : null

  const hostname = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const { error } = await upsertProfileAdmin(
    {
      id: user.id,
      email,
      role,
      full_name: fullName,
      beta_status: defaultBetaStatus(hostname),
      analyses_used: 0,
      is_subscribed: false,
      player_id: null,
    },
    { hostname },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
