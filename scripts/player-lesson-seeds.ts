import type { SupabaseClient } from '@supabase/supabase-js'

export type LessonTemplate = {
  daysOffset: number
  hour: number
  status: 'completed' | 'scheduled'
  durationMins?: number
  notes: string
}

/** Past = completed (daysOffset < 0). Future = scheduled (daysOffset > 0). */
export const LESSONS_BY_EMAIL: Record<string, LessonTemplate[]> = {
  'test.new@playvia.studio': [
    {
      daysOffset: -28,
      hour: 10,
      status: 'completed',
      notes: 'Welcome session — baseline movement and grip check.',
    },
    {
      daysOffset: -14,
      hour: 15,
      status: 'completed',
      notes: 'Forehand fundamentals — contact point and follow-through.',
    },
    {
      daysOffset: 4,
      hour: 11,
      status: 'scheduled',
      notes: 'First full technique lesson — forehand focus.',
    },
    {
      daysOffset: 11,
      hour: 16,
      status: 'scheduled',
      notes: 'Serve intro and rally consistency.',
    },
  ],
  'test.early@playvia.studio': [
    {
      daysOffset: -21,
      hour: 9,
      status: 'completed',
      notes: 'Elbow alignment on forehand — shadow swings and feed drills.',
    },
    {
      daysOffset: -10,
      hour: 14,
      status: 'completed',
      notes: 'Follow-through and recovery — live-ball patterns.',
    },
    {
      daysOffset: 5,
      hour: 10,
      status: 'scheduled',
      notes: 'Contact point timing — basket and cross-court reps.',
    },
    {
      daysOffset: 12,
      hour: 17,
      status: 'scheduled',
      notes: 'Unit turn integration into match play.',
    },
  ],
  'test.improving@playvia.studio': [
    {
      daysOffset: -42,
      hour: 8,
      status: 'completed',
      notes: 'Hip rotation and setup — alignment sticks on range.',
    },
    {
      daysOffset: -28,
      hour: 13,
      status: 'completed',
      notes: 'Takeaway path — video review and slow-motion swings.',
    },
    {
      daysOffset: -14,
      hour: 9,
      status: 'completed',
      notes: 'Spine angle at address — short game transfer.',
    },
    {
      daysOffset: 6,
      hour: 11,
      status: 'scheduled',
      notes: 'Follow-through hold — wedge distance control.',
    },
    {
      daysOffset: 13,
      hour: 15,
      status: 'scheduled',
      notes: 'On-course session — tee to green routine.',
    },
  ],
  'test.advanced@playvia.studio': [
    {
      daysOffset: -56,
      hour: 10,
      status: 'completed',
      notes: 'Contact point under pressure — serve +1 patterns.',
    },
    {
      daysOffset: -35,
      hour: 14,
      status: 'completed',
      notes: 'Elbow slot on backhand — cross-court live balls.',
    },
    {
      daysOffset: -18,
      hour: 9,
      status: 'completed',
      notes: 'Unit turn and recovery — point play scenarios.',
    },
    {
      daysOffset: -5,
      hour: 16,
      status: 'completed',
      notes: 'Footwork ladder into approach shots — match simulation.',
    },
    {
      daysOffset: 7,
      hour: 11,
      status: 'scheduled',
      notes: 'Fine-tuning swing path — video and target zones.',
    },
  ],
  'test.regression@playvia.studio': [
    {
      daysOffset: -32,
      hour: 12,
      status: 'completed',
      notes: 'Elbow position and shot pocket — form shooting drills.',
    },
    {
      daysOffset: -18,
      hour: 17,
      status: 'completed',
      notes: 'Wrist snap timing — catch-and-shoot progressions.',
    },
    {
      daysOffset: 3,
      hour: 10,
      status: 'scheduled',
      notes: 'Body rotation reset — slow reps to game speed.',
    },
    {
      daysOffset: 9,
      hour: 18,
      status: 'scheduled',
      notes: 'Jump shot consistency — off-dribble and catch-and-shoot.',
    },
  ],
}

export const TEST_PLAYER_EMAILS = Object.keys(LESSONS_BY_EMAIL)

function lessonStartsAt(daysOffset: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  date.setHours(hour, 0, 0, 0)
  return date
}

export async function clearPlayerLessons(
  client: SupabaseClient,
  playerId: string,
) {
  const { data: lessons } = await client
    .from('lessons')
    .select('id')
    .eq('player_id', playerId)

  const lessonIds = (lessons || []).map(row => row.id as string)
  if (lessonIds.length > 0) {
    await client.from('journal_entries').delete().in('lesson_id', lessonIds)
    await client.from('drills').update({ lesson_id: null }).in('lesson_id', lessonIds)
    await client.from('videos').update({ lesson_id: null }).in('lesson_id', lessonIds)
    await client
      .from('analysis_sessions')
      .update({ lesson_id: null })
      .in('lesson_id', lessonIds)
  }

  await client.from('lessons').delete().eq('player_id', playerId)
}

export async function seedLessonsForPlayer(
  client: SupabaseClient,
  playerId: string,
  templates: LessonTemplate[],
  options?: { replace?: boolean },
) {
  if (options?.replace !== false) {
    await clearPlayerLessons(client, playerId)
  }

  let inserted = 0
  for (const template of templates) {
    const startsAt = lessonStartsAt(template.daysOffset, template.hour)

    const { error } = await client.from('lessons').insert({
      player_id: playerId,
      starts_at: startsAt.toISOString(),
      duration_mins: template.durationMins ?? 60,
      status: template.status,
      notes: template.notes,
      booking_tier: 'private',
    })

    if (error) {
      console.error(`  Lesson insert failed:`, error.message)
    } else {
      inserted++
    }
  }

  return inserted
}

export async function seedLessonsForEmail(
  client: SupabaseClient,
  email: string,
) {
  const templates = LESSONS_BY_EMAIL[email]
  if (!templates) {
    console.log(`  No lesson config for ${email}`)
    return 0
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, player_id')
    .eq('email', email)
    .maybeSingle()

  if (profileError) {
    console.error(`  Profile lookup failed for ${email}:`, profileError.message)
    return 0
  }

  if (!profile?.player_id) {
    console.log(`  Skipped ${email} — player not found (run seed:players first)`)
    return 0
  }

  const count = await seedLessonsForPlayer(
    client,
    profile.player_id,
    templates,
  )
  const completed = templates.filter(l => l.status === 'completed').length
  const upcoming = templates.filter(l => l.status === 'scheduled').length
  console.log(
    `✓ ${email}: ${count} lessons (${completed} completed, ${upcoming} upcoming)`,
  )
  return count
}
