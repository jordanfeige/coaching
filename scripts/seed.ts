// Must be first - before any other imports
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars. Make sure .env.local has:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

type PlayerSeed = {
  name: string
  sport: string
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced'
  age: number
}

type IssueSeed = {
  area: string
  severity: 'critical' | 'moderate' | 'minor'
  what_i_see: string
  ideal: string
  consequence: string
  simple_cue: string
}

type StrengthSeed = {
  area: string
  what_i_see: string
  why_it_helps: string
}

type CreatedPlayer = PlayerSeed & {
  id: string
}

const supabase = createClient(supabaseUrl, supabaseKey)

const PLAYERS: PlayerSeed[] = [
  { name: 'Marcus Thompson', sport: 'tennis', skill_level: 'Intermediate', age: 16 },
  { name: 'Sarah Chen', sport: 'tennis', skill_level: 'Advanced', age: 14 },
  { name: 'Tyler Brooks', sport: 'golf', skill_level: 'Beginner', age: 22 },
  { name: 'Emma Rodriguez', sport: 'golf', skill_level: 'Intermediate', age: 17 },
  { name: 'Jake Morrison', sport: 'baseball', skill_level: 'Intermediate', age: 15 },
  { name: 'Aiden Park', sport: 'basketball', skill_level: 'Advanced', age: 18 },
  { name: 'Olivia Williams', sport: 'tennis', skill_level: 'Beginner', age: 12 },
  { name: 'Noah Garcia', sport: 'pickleball', skill_level: 'Intermediate', age: 35 },
]

const ISSUES: Record<string, IssueSeed[]> = {
  tennis: [
    { area: 'Follow Through', severity: 'critical', what_i_see: 'Arm decelerates before completion at 0:03', ideal: 'Racket should finish over opposite shoulder', consequence: 'Loss of pace and spin consistency', simple_cue: 'Finish high and through' },
    { area: 'Contact Point', severity: 'moderate', what_i_see: 'Contact point approximately 8 inches too close to body at 0:02', ideal: '18-24 inches in front of lead hip', consequence: 'Jammed shots with reduced power', simple_cue: 'Hit out in front' },
    { area: 'Footwork', severity: 'moderate', what_i_see: 'Flat-footed at contact - no weight transfer visible at 0:04', ideal: 'Weight should shift forward through contact', consequence: 'Loss of approximately 20% of potential power', simple_cue: 'Step into the ball' },
    { area: 'Unit Turn', severity: 'minor', what_i_see: 'Shoulder rotation reaches only 65 degrees at 0:01', ideal: '90+ degrees for full power generation', consequence: 'Reduced racket head speed at contact', simple_cue: 'Turn your shoulders early' },
    { area: 'Grip', severity: 'minor', what_i_see: 'Semi-western grip slipping to eastern under pressure', ideal: 'Consistent grip pressure throughout swing', consequence: 'Inconsistent spin and direction', simple_cue: 'Firm grip at contact' },
  ],
  golf: [
    { area: 'Hip Resistance', severity: 'critical', what_i_see: 'Hips rotate 60+ degrees on backswing - no resistance at 0:02', ideal: '45 degrees max hip turn creates X-factor tension', consequence: 'Power leak of 20-30 yards - no stored energy to release', simple_cue: 'Resist with your hips' },
    { area: 'Impact Position', severity: 'critical', what_i_see: 'Weight on trail foot at impact - reverse pivot visible at 0:04', ideal: '80%+ weight on lead foot at impact', consequence: 'Consistent thin contact and loss of compression', simple_cue: 'Drive into your left side' },
    { area: 'Backswing Plane', severity: 'moderate', what_i_see: 'Club moves inside target line in first 18 inches at 0:01', ideal: 'Club should track along target line initially', consequence: 'Over-the-top downswing causing pull or slice', simple_cue: 'Club head outside hands' },
    { area: 'Follow Through', severity: 'moderate', what_i_see: 'Follow through stops at 270 degrees - incomplete at 0:06', ideal: '330-360 degrees with full body rotation', consequence: '15-20% power loss and push miss pattern', simple_cue: 'Finish tall and balanced' },
    { area: 'Lag', severity: 'minor', what_i_see: 'Early wrist release at parallel - casting motion at 0:03', ideal: '90+ degree lag angle maintained to impact', consequence: 'Significant distance loss and inconsistent strike', simple_cue: 'Hold the angle longer' },
  ],
  baseball: [
    { area: 'Hip Rotation', severity: 'critical', what_i_see: 'Hips and shoulders rotate simultaneously at 0:02', ideal: 'Hips should clear 40-50 degrees before shoulder rotation', consequence: 'Loss of bat speed and power - arms doing all the work', simple_cue: 'Hips first, hands follow' },
    { area: 'Bat Path', severity: 'moderate', what_i_see: 'Steep downward attack angle of approximately -12 degrees at 0:03', ideal: 'Attack angle of -5 to +5 for line drives', consequence: 'Ground balls and choppers - limited power to outfield', simple_cue: 'Stay through the zone' },
    { area: 'Load', severity: 'minor', what_i_see: 'Weight shifts backward 4-5 inches - too far at 0:01', ideal: 'Subtle 2-3 inch inward knee movement only', consequence: 'Timing issues and head movement on contact', simple_cue: 'Small load, big turn' },
  ],
  basketball: [
    { area: 'Elbow Alignment', severity: 'critical', what_i_see: 'Shooting elbow flared 25 degrees at 0:02 - not under the ball', ideal: 'Elbow directly under ball pointing at basket', consequence: 'Consistent right-side miss pattern on jump shots', simple_cue: 'Elbow under the ball' },
    { area: 'Guide Hand', severity: 'moderate', what_i_see: 'Guide hand thumb pointing toward basket at release 0:03', ideal: 'Guide hand fingers pointing up, not applying pressure', consequence: 'Clockwise ball rotation causing unpredictable bounces', simple_cue: 'Guide hand stays still' },
    { area: 'Leg Drive', severity: 'minor', what_i_see: 'Arms begin extension before legs fully drive at 0:02', ideal: 'Full leg drive completes before arm extension begins', consequence: 'Loss of power - arms overcompensating', simple_cue: 'Legs first, then arms' },
  ],
  pickleball: [
    { area: 'Dinking', severity: 'critical', what_i_see: 'Wrist flicking on kitchen shots visible at 0:03', ideal: 'Quiet wrist with shoulder-driven motion', consequence: 'Unforced errors - ball popping up for easy put-aways', simple_cue: 'Soft hands, no wrist' },
    { area: 'Third Shot', severity: 'moderate', what_i_see: 'Drive selected when drop was appropriate at 0:05', ideal: 'Third shot drop to neutralize opponents at net', consequence: 'Opponents staying at kitchen - losing point pattern', simple_cue: 'When in doubt, drop' },
    { area: 'Footwork', severity: 'minor', what_i_see: "Stopping in transition zone at 0:04 - no split step", ideal: 'Move through transition zone to kitchen line', consequence: "Getting caught in no-man's land on passing shots", simple_cue: 'Keep moving forward' },
  ],
}

const STRENGTHS: Record<string, StrengthSeed[]> = {
  tennis: [
    { area: 'Ready Position', what_i_see: 'Athletic stance at 0:00 with weight on balls of feet', why_it_helps: 'Enables quick reaction in any direction' },
    { area: 'Swing Path', what_i_see: 'Low-to-high path at 45 degrees through contact zone', why_it_helps: 'Generates consistent topspin and net clearance' },
    { area: 'Head Position', what_i_see: 'Head stays still through contact - visible at 0:03', why_it_helps: 'Consistent contact point and better ball tracking' },
  ],
  golf: [
    { area: 'Address', what_i_see: 'Spine angle at 32 degrees - within optimal 30-35 range', why_it_helps: 'Sets up consistent swing plane and contact' },
    { area: 'Shoulder Turn', what_i_see: '88 degree shoulder rotation at top of backswing at 0:02', why_it_helps: 'Stores maximum elastic energy for power release' },
    { area: 'Balance', what_i_see: 'Holds finish position for 3+ seconds - excellent at 0:07', why_it_helps: 'Indicates full weight transfer and swing completion' },
  ],
  baseball: [
    { area: 'Stance', what_i_see: 'Athletic stance with slight knee bend - good at 0:00', why_it_helps: 'Enables explosive hip rotation through contact' },
    { area: 'Extension', what_i_see: 'Both arms fully extended 10 inches past contact at 0:04', why_it_helps: 'Maximum power transfer through the hitting zone' },
  ],
  basketball: [
    { area: 'Shot Pocket', what_i_see: 'Ball consistently positioned at chin height 7 inches from body', why_it_helps: 'Creates repeatable release point for consistency' },
    { area: 'Follow Through', what_i_see: 'Full wrist snap with goose-neck finish held at 0:04', why_it_helps: 'Proper backspin and optimal arc trajectory' },
  ],
  pickleball: [
    { area: 'Ready Position', what_i_see: 'Paddle at waist height with split step timing at 0:01', why_it_helps: 'Enables quick response to both sides' },
    { area: 'Volleys', what_i_see: 'Compact punch motion with no backswing visible at 0:03', why_it_helps: 'Reduces errors and increases control at the net' },
  ],
}

const CONFIDENCE = ['high', 'medium', 'high', 'high'] as const

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function isMissingColumn(errorMessage: string, column: string) {
  return errorMessage.includes(`column ${column} does not exist`) || errorMessage.includes('schema cache')
}

function buildAnalysis(sport: string, skillLevel: string, sessionNum: number) {
  const issues = ISSUES[sport] || ISSUES.tennis
  const strengths = STRENGTHS[sport] || STRENGTHS.tennis
  const isAdvanced = skillLevel === 'Advanced'
  const isIntermediate = skillLevel === 'Intermediate'
  const issueCount = isAdvanced ? randomBetween(1, 2) : isIntermediate ? randomBetween(2, 3) : randomBetween(2, 4)
  const selectedIssues = [...issues].sort(() => Math.random() - 0.5).slice(0, issueCount)
  const improvedIssues = selectedIssues.map(issue => ({
    ...issue,
    severity: sessionNum > 3 && issue.severity === 'critical'
      ? 'moderate'
      : sessionNum > 5 && issue.severity === 'moderate'
        ? 'minor'
        : issue.severity,
    drill: `${issue.area} Correction Drill`,
    drill_sets_reps: '3 sets of 10',
    drill_instruction: `Focus on ${issue.simple_cue}. Start slowly and build speed.`,
    success_criteria: `Consistently achieve ${issue.ideal}`,
  }))
  const selectedStrengths = [...strengths]
    .sort(() => Math.random() - 0.5)
    .slice(0, randomBetween(1, Math.min(3, strengths.length)))
  const criticalCount = improvedIssues.filter(issue => issue.severity === 'critical').length
  const moderateCount = improvedIssues.filter(issue => issue.severity === 'moderate').length
  const minorCount = improvedIssues.filter(issue => issue.severity === 'minor').length
  const rating = isAdvanced ? 'advanced' : isIntermediate ? 'intermediate' : sessionNum > 4 ? 'developing' : 'beginner'
  const confidence = randomFrom([...CONFIDENCE])
  const ratingBonus: Record<string, number> = { elite: 25, advanced: 18, intermediate: 10, developing: 4, beginner: 0 }
  let score = 60
  score -= criticalCount * 12
  score -= moderateCount * 6
  score -= minorCount * 2
  score += Math.min(selectedStrengths.length * 4, 20)
  score += ratingBonus[rating] || 0
  if (confidence === 'high') score += 3
  if (criticalCount === 0) score = Math.min(score, 95)
  score = Math.max(0, Math.min(100, Math.round(score)))
  score = Math.min(100, score + Math.min(sessionNum * 2, 14))

  return {
    overall_rating: rating,
    confidence,
    observations: `0:00 - ${sport} technique assessment begins. 0:01 - Setup and preparation phase. 0:02 - Primary motion initiation. 0:03 - Key contact/impact phase. 0:04 - Follow through observed. 0:05 - Recovery and reset.`,
    technique_notes: `This athlete demonstrates ${rating} level ${sport} technique. The primary areas for improvement center around ${improvedIssues[0]?.area || 'consistency'}. ${selectedStrengths[0] ? `A notable strength is ${selectedStrengths[0].area}.` : ''} Focus on fundamentals to build consistency.`,
    strengths: selectedStrengths,
    areas_to_improve: improvedIssues,
    biggest_win: selectedStrengths[0]
      ? `Strong ${selectedStrengths[0].area} - ${selectedStrengths[0].what_i_see}`
      : 'Consistent effort and athletic positioning throughout',
    priority_focus: `This week: focus on ${improvedIssues[0]?.area || 'consistency'}. ${improvedIssues[0]?.simple_cue || 'Stay focused on fundamentals.'}`,
    overall_score: score,
    critical_count: criticalCount,
    moderate_count: moderateCount,
    minor_count: minorCount,
    strengths_count: selectedStrengths.length,
    top_issue: improvedIssues[0]?.area || null,
    checkpoint_scores: {},
  }
}

async function insertPlayer(playerData: PlayerSeed): Promise<CreatedPlayer | null> {
  const payload = {
    name: playerData.name,
    sport: playerData.sport,
    skill_level: playerData.skill_level,
    age: playerData.age,
    email: `${playerData.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
  }

  let result = await supabase.from('players').insert(payload).select().single()

  if (result.error && isMissingColumn(result.error.message, 'players.email')) {
    const payloadWithoutEmail = {
      name: payload.name,
      sport: payload.sport,
      skill_level: payload.skill_level,
      age: payload.age,
    }
    result = await supabase.from('players').insert(payloadWithoutEmail).select().single()
  }

  if (result.error) {
    console.error(`Failed to create player ${playerData.name}:`, result.error.message)
    return null
  }

  return { ...(result.data as { id: string }), ...playerData }
}

async function seed() {
  console.log('Starting Playvia seed...\n')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('role', 'coach')
    .limit(1)

  if (!profiles || profiles.length === 0) {
    console.error('No coach profile found. Log in as a coach first, then run the seed again.')
    process.exit(1)
  }

  const coachProfile = profiles[0]
  console.log(`Found coach: ${coachProfile.email}\n`)
  console.log('Creating players...')

  const createdPlayers: CreatedPlayer[] = []

  for (const playerData of PLAYERS) {
    const player = await insertPlayer(playerData)
    if (!player) continue
    createdPlayers.push(player)
    console.log(`  Created player: ${playerData.name} (${playerData.sport})`)
  }

  console.log(`\nCreated ${createdPlayers.length} players\n`)
  console.log('Creating analysis sessions...')

  let totalSessions = 0

  for (const player of createdPlayers) {
    const sessionCount = randomBetween(3, 8)

    for (let i = 0; i < sessionCount; i++) {
      const daysBack = (sessionCount - i) * randomBetween(5, 10)
      const analysis = buildAnalysis(player.sport, player.skill_level, i + 1)
      const shotType = player.sport === 'tennis'
        ? randomFrom(['Forehand', 'Backhand', 'Serve'])
        : player.sport === 'golf'
          ? randomFrom(['Driver', 'Iron', 'Wedge'])
          : null
      const { error } = await supabase.from('analysis_sessions').insert({
        user_id: coachProfile.id,
        player_id: player.id,
        sport: player.sport,
        shot_type: shotType,
        overall_score: analysis.overall_score,
        rating: analysis.overall_rating,
        strengths_count: analysis.strengths_count,
        critical_count: analysis.critical_count,
        moderate_count: analysis.moderate_count,
        minor_count: analysis.minor_count,
        top_issue: analysis.top_issue,
        biggest_win: analysis.biggest_win,
        checkpoint_scores: analysis.checkpoint_scores,
        full_result: analysis,
        analyzed_at: daysAgo(daysBack),
      })

      if (error) {
        console.error(`Session error for ${player.name}:`, error.message)
      } else {
        totalSessions++
      }
    }

    console.log(`  ${player.name}: ${sessionCount} sessions (${player.sport}, ${player.skill_level})`)
  }

  console.log(`\nCreated ${totalSessions} analysis sessions\n`)
  console.log('Creating lessons...')

  let totalLessons = 0

  for (const player of createdPlayers.slice(0, 5)) {
    const lessonCount = randomBetween(2, 5)

    for (let i = 0; i < lessonCount; i++) {
      const daysOffset = randomBetween(-14, 21)
      const lessonDate = new Date()
      lessonDate.setDate(lessonDate.getDate() + daysOffset)
      lessonDate.setHours(randomBetween(7, 18), 0, 0, 0)
      const status = daysOffset < 0 ? 'completed' : 'scheduled'
      const { error } = await supabase.from('lessons').insert({
        player_id: player.id,
        starts_at: lessonDate.toISOString(),
        duration_mins: randomFrom([30, 45, 60, 90]),
        status,
        notes: status === 'completed'
          ? `Great session with ${player.name}. Focused on ${ISSUES[player.sport]?.[0]?.area || 'fundamentals'}. Good progress today.`
          : null,
      })

      if (!error) totalLessons++
      else console.error(`Lesson error for ${player.name}:`, error.message)
    }

    console.log(`  ${player.name}: ${lessonCount} lessons`)
  }

  console.log('\nSeed complete!')
  console.log(`  ${createdPlayers.length} players`)
  console.log(`  ${totalSessions} analysis sessions`)
  console.log(`  ${totalLessons} lessons`)
  console.log('\nRefresh your Pulse page to see the data.')
}

seed().catch(error => {
  console.error(error)
  process.exit(1)
})
