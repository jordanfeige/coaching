import { createElement } from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { RecruitingReminderEmail } from '@/emails/RecruitingReminderEmail'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playerId } = (await req.json()) as { playerId?: string }
  if (!playerId) {
    return NextResponse.json(
      { error: 'playerId required' },
      { status: 400 },
    )
  }

  const { data: recruiting } = await supabase
    .from('recruiting_profiles')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle()

  if (!recruiting) {
    const { data: playerCheck } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .maybeSingle()

    if (!playerCheck) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
  }

  const admin = createSupabaseAdminClient()

  const { data: player } = await admin
    .from('players')
    .select('id, name')
    .eq('id', playerId)
    .single()

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  const { data: playerProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle()

  if (!playerProfile?.id) {
    return NextResponse.json(
      { error: 'No login found for this player' },
      { status: 404 },
    )
  }

  const { data: authRecord } = await admin.auth.admin.getUserById(
    playerProfile.id,
  )

  const email = authRecord?.user?.email
  if (!email) {
    return NextResponse.json(
      { error: 'Player email not found' },
      { status: 404 },
    )
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://playvia.studio'

  const firstName = (player.name || 'there').split(' ')[0]

  await sendEmail({
    to: email,
    subject: 'Complete your Playvia recruiting profile',
    template: createElement(RecruitingReminderEmail, {
      firstName,
        recruitingUrl: `${appUrl}/player/recruiting`,
    }),
  })

  await admin
    .from('recruiting_profiles')
    .upsert(
      {
        player_id: playerId,
        coach_id: user.id,
        reminder_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'player_id' },
    )

  return NextResponse.json({ success: true })
}
