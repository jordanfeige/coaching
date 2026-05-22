import { NextRequest, NextResponse } from 'next/server'
import { slugifyDrillName } from '@/lib/drills-library'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
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

  const body = (await req.json()) as {
    name?: string
    primary_category?: string
    drill_type?: string
    skill_level?: string
    duration_minutes?: number
    mode?: string
    description?: string
    steps?: string[]
    success_criteria?: string
    coaching_cue?: string
    requires?: string[]
    checkpoints?: string[]
  }

  const name = body.name?.trim()
  const description = body.description?.trim()
  if (!name || !description) {
    return NextResponse.json(
      { error: 'name and description are required' },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('drills_library')
    .insert({
      slug: slugifyDrillName(name),
      name,
      primary_category: body.primary_category ?? 'Forehand',
      drill_type: body.drill_type ?? null,
      checkpoints: body.checkpoints ?? [],
      skill_level: body.skill_level ?? 'intermediate',
      duration_minutes: body.duration_minutes ?? 15,
      mode: body.mode ?? 'solo',
      requires: body.requires ?? [],
      description,
      steps: body.steps ?? [],
      success_criteria: body.success_criteria ?? null,
      coaching_cue: body.coaching_cue ?? null,
      source: 'player',
      source_attribution: 'Player-authored drill',
      is_public: false,
      created_by_player_id: playerId,
    })
    .select('id, name')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Could not create drill' },
      { status: 500 },
    )
  }

  return NextResponse.json({ id: data.id, name: data.name })
}
