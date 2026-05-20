// Seed journey_score_inputs for test players, then one recalc each.
// Run: npm run seed:journey-inputs

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { updateJourneyInput } from '../src/lib/journey-inputs'
import { recalcJourneyRating } from '../src/lib/journey-recalc'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const TEST_EMAILS = [
  'test.new@playvia.studio',
  'test.early@playvia.studio',
  'test.improving@playvia.studio',
  'test.advanced@playvia.studio',
  'test.regression@playvia.studio',
] as const

type InputSeed = {
  category: 'tennis' | 'academics' | 'exposure' | 'coachability'
  inputKey: string
  valueNumeric: number
  unit: string
  source: string
  verified: boolean
}

async function resolvePlayerId(email: string): Promise<string> {
  const { data: authUsers, error: listErr } =
    await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw listErr
  const authUser = authUsers.users.find(u => u.email === email)
  if (!authUser) throw new Error(`Auth user not found: ${email}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (profile?.player_id) return profile.player_id

  const { data: legacy } = await supabase
    .from('players')
    .select('id')
    .eq('parent_id', authUser.id)
    .maybeSingle()

  if (legacy?.id) return legacy.id
  throw new Error(`No player linked for ${email}`)
}

async function seedInputs(playerId: string, inputs: InputSeed[]) {
  for (const row of inputs) {
    await updateJourneyInput({
      playerId,
      category: row.category,
      inputKey: row.inputKey,
      valueNumeric: row.valueNumeric,
      unit: row.unit,
      source: row.source,
      verified: row.verified,
      triggerRecalc: false,
      actor: 'seed',
    })
  }
}

/** Alex New — brand new, minimal signals → Developing tier */
const alexInputs: InputSeed[] = [
  { category: 'tennis', inputKey: 'utr_rating', valueNumeric: 4.8, unit: 'utr_points', source: 'self_reported', verified: false },
  { category: 'academics', inputKey: 'gpa', valueNumeric: 2.9, unit: 'gpa', source: 'self_reported', verified: false },
  { category: 'exposure', inputKey: 'sanctioned_tournaments_12mo', valueNumeric: 0, unit: 'count', source: 'usta_manual', verified: false },
  { category: 'exposure', inputKey: 'verified_reels_count', valueNumeric: 0, unit: 'count', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'technique_velocity_90d', valueNumeric: 0, unit: 'points', source: 'video_analysis', verified: true },
  { category: 'coachability', inputKey: 'issue_resolution_avg_sessions', valueNumeric: 5, unit: 'sessions', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'sessions_90d', valueNumeric: 0, unit: 'count', source: 'playvia', verified: true },
]

/** Jamie Early — early intermediate, a few sessions */
const jamieInputs: InputSeed[] = [
  { category: 'tennis', inputKey: 'utr_rating', valueNumeric: 6.2, unit: 'utr_points', source: 'utr_api', verified: true },
  { category: 'academics', inputKey: 'gpa', valueNumeric: 3.1, unit: 'gpa', source: 'self_reported', verified: false },
  { category: 'academics', inputKey: 'sat', valueNumeric: 980, unit: 'sat', source: 'self_reported', verified: false },
  { category: 'exposure', inputKey: 'sanctioned_tournaments_12mo', valueNumeric: 2, unit: 'count', source: 'usta_manual', verified: false },
  { category: 'exposure', inputKey: 'verified_reels_count', valueNumeric: 0, unit: 'count', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'technique_velocity_90d', valueNumeric: 5, unit: 'points', source: 'video_analysis', verified: true },
  { category: 'coachability', inputKey: 'issue_resolution_avg_sessions', valueNumeric: 4.5, unit: 'sessions', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'sessions_90d', valueNumeric: 2, unit: 'count', source: 'playvia', verified: true },
]

/** Morgan Progress — improving athlete (golf), solid coachability signal */
const morganInputs: InputSeed[] = [
  { category: 'tennis', inputKey: 'utr_rating', valueNumeric: 6.5, unit: 'utr_points', source: 'self_reported', verified: false },
  { category: 'academics', inputKey: 'gpa', valueNumeric: 3.35, unit: 'gpa', source: 'self_reported', verified: true },
  { category: 'academics', inputKey: 'sat', valueNumeric: 1120, unit: 'sat', source: 'college_board', verified: true },
  { category: 'exposure', inputKey: 'sanctioned_tournaments_12mo', valueNumeric: 3, unit: 'count', source: 'usta_manual', verified: false },
  { category: 'exposure', inputKey: 'verified_reels_count', valueNumeric: 1, unit: 'count', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'technique_velocity_90d', valueNumeric: 16, unit: 'points', source: 'video_analysis', verified: true },
  { category: 'coachability', inputKey: 'issue_resolution_avg_sessions', valueNumeric: 2.8, unit: 'sessions', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'sessions_90d', valueNumeric: 5, unit: 'count', source: 'playvia', verified: true },
]

/**
 * Taylor Advanced — regional prospect (~47 on v1.1).
 * Core signals match M1c spec (UTR ~7.3+, SAT, tournaments, coachability);
 * tuned slightly so total lands in Regional band vs Verified at raw spec values.
 */
const taylorInputs: InputSeed[] = [
  { category: 'tennis', inputKey: 'utr_rating', valueNumeric: 7.38, unit: 'utr_points', source: 'utr_api', verified: true },
  { category: 'academics', inputKey: 'gpa', valueNumeric: 3.1, unit: 'gpa', source: 'self_reported', verified: false },
  { category: 'academics', inputKey: 'sat', valueNumeric: 1050, unit: 'sat', source: 'college_board', verified: true },
  { category: 'exposure', inputKey: 'sanctioned_tournaments_12mo', valueNumeric: 2, unit: 'count', source: 'usta_manual', verified: false },
  { category: 'exposure', inputKey: 'verified_reels_count', valueNumeric: 0, unit: 'count', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'technique_velocity_90d', valueNumeric: 6, unit: 'points', source: 'video_analysis', verified: true },
  { category: 'coachability', inputKey: 'issue_resolution_avg_sessions', valueNumeric: 4, unit: 'sessions', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'sessions_90d', valueNumeric: 3, unit: 'count', source: 'playvia', verified: true },
]

/** Casey Regression — peaked then slipped on coachability */
const caseyInputs: InputSeed[] = [
  { category: 'tennis', inputKey: 'utr_rating', valueNumeric: 7.05, unit: 'utr_points', source: 'utr_api', verified: true },
  { category: 'academics', inputKey: 'gpa', valueNumeric: 3.25, unit: 'gpa', source: 'self_reported', verified: true },
  { category: 'academics', inputKey: 'sat', valueNumeric: 1090, unit: 'sat', source: 'college_board', verified: true },
  { category: 'exposure', inputKey: 'sanctioned_tournaments_12mo', valueNumeric: 5, unit: 'count', source: 'usta_manual', verified: false },
  { category: 'exposure', inputKey: 'verified_reels_count', valueNumeric: 1, unit: 'count', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'technique_velocity_90d', valueNumeric: 3, unit: 'points', source: 'video_analysis', verified: true },
  { category: 'coachability', inputKey: 'issue_resolution_avg_sessions', valueNumeric: 4.8, unit: 'sessions', source: 'playvia', verified: true },
  { category: 'coachability', inputKey: 'sessions_90d', valueNumeric: 2, unit: 'count', source: 'playvia', verified: true },
]

const PLAYER_CONFIG: Record<
  (typeof TEST_EMAILS)[number],
  { label: string; inputs: InputSeed[] }
> = {
  'test.new@playvia.studio': { label: 'Alex New', inputs: alexInputs },
  'test.early@playvia.studio': { label: 'Jamie Early', inputs: jamieInputs },
  'test.improving@playvia.studio': { label: 'Morgan Progress', inputs: morganInputs },
  'test.advanced@playvia.studio': { label: 'Taylor Advanced', inputs: taylorInputs },
  'test.regression@playvia.studio': { label: 'Casey Regression', inputs: caseyInputs },
}

async function main() {
  console.log('Seeding journey inputs for test players...\n')

  for (const email of TEST_EMAILS) {
    const config = PLAYER_CONFIG[email]
    const playerId = await resolvePlayerId(email)
    console.log(`→ ${config.label} (${email})`)

    await seedInputs(playerId, config.inputs)
    const breakdown = await recalcJourneyRating(playerId, supabaseUrl, serviceKey)
    console.log(
      `  ✓ ${config.inputs.length} inputs · rating ${breakdown.total} · ${breakdown.tier}\n`,
    )
  }

  console.log('Done. Verify journey_ratings in Supabase for each test player.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
