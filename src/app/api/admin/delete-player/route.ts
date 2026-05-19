import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playerId, profileId } = (await req.json()) as {
    playerId?: string
    profileId?: string
  }

  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  if (profileId) {
    const { error: authError } = await admin.auth.admin.deleteUser(profileId)
    if (authError) {
      console.error('delete-player auth:', authError)
    }
    await admin.from('profiles').delete().eq('id', profileId)
  }

  return NextResponse.json({ ok: true })
}
