import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import {
  applyProfileFieldUpdate,
  type ProfileUpdateField,
} from '@/lib/player-profile-update'

export const dynamic = 'force-dynamic'

const FIELDS = new Set<ProfileUpdateField>([
  'birth_date',
  'class_year',
  'sport',
  'skill_level',
  'gpa',
  'sat',
  'act',
  'goal',
  'target_division',
  'target_academic_tier',
  'target_geography',
  'target_state',
  'not_recruiting',
])

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return NextResponse.json({ error: 'No player' }, { status: 404 })
  }

  let body: { field?: string; value?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.field || !FIELDS.has(body.field as ProfileUpdateField)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }

  try {
    await applyProfileFieldUpdate(
      playerId,
      body.field as ProfileUpdateField,
      body.value,
    )
    return NextResponse.json({ ok: true, field: body.field, value: body.value })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Save failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
