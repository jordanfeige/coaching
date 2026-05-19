import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import {
  LESSONS_BY_EMAIL,
  seedLessonsForPlayer,
} from './player-lesson-seeds'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars. Make sure .env.local has:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

type SessionConfig = {
  score: number
  topIssue: string
  criticalCount: number
  daysAgo: number
  issues: string[]
  strengths: string[]
}

type PlayerConfig = {
  email: string
  password: string
  name: string
  sport: string
  skillLevel: string
  sessions: SessionConfig[]
}

async function createTestPlayer(config: PlayerConfig) {
  console.log(`\nCreating ${config.name} (${config.email})...`)

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: config.email,
      password: config.password,
      email_confirm: true,
    })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log(`  Skipped — ${config.email} already exists (run seed:players:clean first)`)
      return
    }
    console.error(`Auth error for ${config.name}:`, authError)
    return
  }

  const userId = authData.user.id

  const playerPayload = {
    name: config.name,
    sport: config.sport,
    skill_level: config.skillLevel,
    email: config.email,
  }

  let playerResult = await supabase
    .from('players')
    .insert(playerPayload)
    .select()
    .single()

  if (playerResult.error?.message?.includes('email')) {
    const { email: _email, ...withoutEmail } = playerPayload
    playerResult = await supabase
      .from('players')
      .insert(withoutEmail)
      .select()
      .single()
  }

  if (playerResult.error || !playerResult.data) {
    console.error(`Player error for ${config.name}:`, playerResult.error)
    await supabase.auth.admin.deleteUser(userId)
    return
  }

  const playerData = playerResult.data

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email: config.email,
    role: 'player',
    player_id: playerData.id,
    beta_status: 'approved',
    analyses_used: config.sessions.length,
  })

  if (profileError) {
    console.error(`Profile error for ${config.name}:`, profileError)
    return
  }

  await supabase.from('account_players').upsert(
    { account_id: userId, player_id: playerData.id },
    { onConflict: 'account_id,player_id' },
  )

  for (const session of config.sessions) {
    const analyzedAt = new Date()
    analyzedAt.setDate(analyzedAt.getDate() - session.daysAgo)

    const { error: sessionError } = await supabase
      .from('analysis_sessions')
      .insert({
        user_id: userId,
        player_id: playerData.id,
        sport: config.sport,
        overall_score: session.score,
        top_issue: session.topIssue,
        critical_count: session.criticalCount,
        moderate_count: 1,
        minor_count: 1,
        strengths_count: session.strengths.length,
        rating: session.score >= 85 ? 'good' : 'needs_work',
        analyzed_at: analyzedAt.toISOString(),
        full_result: {
          overall_score: session.score,
          areas_to_improve: session.issues.map(issue => ({
            area: issue,
            severity: 'moderate',
            explanation: `${issue} needs improvement`,
            drill: `${issue} drill`,
          })),
          strengths: session.strengths.map(s => ({
            area: s,
            explanation: `${s} is solid`,
          })),
          top_issue: session.topIssue,
        },
      })

    if (sessionError) {
      console.error(`Session error for ${config.name}:`, sessionError)
    }
  }

  if (config.sessions.length > 0) {
    const last = config.sessions[config.sessions.length - 1]
    await supabase.from('drills').insert({
      player_id: playerData.id,
      title: `${last.topIssue} drill`,
      description: `Work on improving your ${last.topIssue}. 3 sets of 15 reps.`,
    })
  }

  const lessonTemplates = LESSONS_BY_EMAIL[config.email]
  if (lessonTemplates) {
    const lessonCount = await seedLessonsForPlayer(
      supabase,
      playerData.id,
      lessonTemplates,
    )
    console.log(
      `✓ Created ${config.name} with ${config.sessions.length} sessions, ${lessonCount} lessons`,
    )
    return
  }

  console.log(
    `✓ Created ${config.name} with ${config.sessions.length} sessions`,
  )
}

async function main() {
  console.log('Seeding test players...\n')

  await createTestPlayer({
    email: 'test.new@playvia.studio',
    password: 'Playvia2026!',
    name: 'Alex New',
    sport: 'tennis',
    skillLevel: 'beginner',
    sessions: [],
  })

  await createTestPlayer({
    email: 'test.early@playvia.studio',
    password: 'Playvia2026!',
    name: 'Jamie Early',
    sport: 'tennis',
    skillLevel: 'intermediate',
    sessions: [
      {
        score: 62,
        topIssue: 'Elbow Alignment',
        criticalCount: 2,
        daysAgo: 14,
        issues: ['Elbow Alignment', 'Follow Through'],
        strengths: ['Ready Position'],
      },
      {
        score: 67,
        topIssue: 'Elbow Alignment',
        criticalCount: 2,
        daysAgo: 7,
        issues: ['Elbow Alignment', 'Contact Point'],
        strengths: ['Ready Position', 'Unit Turn'],
      },
    ],
  })

  await createTestPlayer({
    email: 'test.improving@playvia.studio',
    password: 'Playvia2026!',
    name: 'Morgan Progress',
    sport: 'golf',
    skillLevel: 'intermediate',
    sessions: [
      {
        score: 55,
        topIssue: 'Hip Rotation',
        criticalCount: 3,
        daysAgo: 45,
        issues: ['Hip Rotation', 'Follow Through', 'Spine Angle'],
        strengths: ['Grip'],
      },
      {
        score: 61,
        topIssue: 'Hip Rotation',
        criticalCount: 2,
        daysAgo: 35,
        issues: ['Hip Rotation', 'Follow Through'],
        strengths: ['Grip', 'Address Position'],
      },
      {
        score: 68,
        topIssue: 'Follow Through',
        criticalCount: 2,
        daysAgo: 25,
        issues: ['Follow Through', 'Hip Rotation'],
        strengths: ['Grip', 'Address Position', 'Spine Angle'],
      },
      {
        score: 74,
        topIssue: 'Follow Through',
        criticalCount: 1,
        daysAgo: 14,
        issues: ['Follow Through'],
        strengths: ['Grip', 'Address Position', 'Spine Angle', 'Hip Rotation'],
      },
      {
        score: 79,
        topIssue: 'Follow Through',
        criticalCount: 1,
        daysAgo: 5,
        issues: ['Follow Through'],
        strengths: [
          'Grip',
          'Address Position',
          'Spine Angle',
          'Hip Rotation',
          'Takeaway',
        ],
      },
    ],
  })

  await createTestPlayer({
    email: 'test.advanced@playvia.studio',
    password: 'Playvia2026!',
    name: 'Taylor Advanced',
    sport: 'tennis',
    skillLevel: 'advanced',
    sessions: [
      {
        score: 71,
        topIssue: 'Contact Point',
        criticalCount: 2,
        daysAgo: 60,
        issues: ['Contact Point', 'Elbow Alignment', 'Follow Through'],
        strengths: ['Ready Position'],
      },
      {
        score: 76,
        topIssue: 'Contact Point',
        criticalCount: 2,
        daysAgo: 48,
        issues: ['Contact Point', 'Elbow Alignment'],
        strengths: ['Ready Position', 'Follow Through'],
      },
      {
        score: 82,
        topIssue: 'Elbow Alignment',
        criticalCount: 1,
        daysAgo: 35,
        issues: ['Elbow Alignment'],
        strengths: ['Ready Position', 'Follow Through', 'Contact Point'],
      },
      {
        score: 88,
        topIssue: 'Elbow Alignment',
        criticalCount: 1,
        daysAgo: 21,
        issues: ['Elbow Alignment'],
        strengths: [
          'Ready Position',
          'Follow Through',
          'Contact Point',
          'Unit Turn',
        ],
      },
      {
        score: 92,
        topIssue: 'Footwork',
        criticalCount: 1,
        daysAgo: 10,
        issues: ['Footwork'],
        strengths: [
          'Ready Position',
          'Follow Through',
          'Contact Point',
          'Unit Turn',
          'Elbow Alignment',
        ],
      },
      {
        score: 95,
        topIssue: 'Footwork',
        criticalCount: 0,
        daysAgo: 2,
        issues: ['Footwork'],
        strengths: [
          'Ready Position',
          'Follow Through',
          'Contact Point',
          'Unit Turn',
          'Elbow Alignment',
          'Swing Path',
        ],
      },
    ],
  })

  await createTestPlayer({
    email: 'test.regression@playvia.studio',
    password: 'Playvia2026!',
    name: 'Casey Regression',
    sport: 'basketball',
    skillLevel: 'intermediate',
    sessions: [
      {
        score: 78,
        topIssue: 'Elbow Position',
        criticalCount: 1,
        daysAgo: 30,
        issues: ['Elbow Position'],
        strengths: ['Knee Bend', 'Shot Pocket'],
      },
      {
        score: 82,
        topIssue: 'Wrist Snap',
        criticalCount: 1,
        daysAgo: 22,
        issues: ['Wrist Snap'],
        strengths: ['Knee Bend', 'Shot Pocket', 'Elbow Position'],
      },
      {
        score: 85,
        topIssue: 'Wrist Snap',
        criticalCount: 1,
        daysAgo: 15,
        issues: ['Wrist Snap'],
        strengths: ['Knee Bend', 'Shot Pocket', 'Elbow Position', 'Guide Hand'],
      },
      {
        score: 71,
        topIssue: 'Body Rotation',
        criticalCount: 3,
        daysAgo: 3,
        issues: ['Body Rotation', 'Wrist Snap', 'Elbow Position'],
        strengths: ['Knee Bend'],
      },
    ],
  })

  console.log('\n✅ All test players created!\n')
  console.log('Login credentials:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('State 1 — No sessions (empty state):')
  console.log('  test.new@playvia.studio / Playvia2026!')
  console.log('')
  console.log('State 2 — Early (2 sessions, building):')
  console.log('  test.early@playvia.studio / Playvia2026!')
  console.log('')
  console.log('State 3 — Improving (5 sessions, golf):')
  console.log('  test.improving@playvia.studio / Playvia2026!')
  console.log('')
  console.log('State 4 — Advanced (6 sessions, mostly fixed):')
  console.log('  test.advanced@playvia.studio / Playvia2026!')
  console.log('')
  console.log('State 5 — Regression (score dropped recently):')
  console.log('  test.regression@playvia.studio / Playvia2026!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
