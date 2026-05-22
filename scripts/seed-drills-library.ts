import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { CURATED_TENNIS_DRILLS_V1 } from '../src/data/curated-tennis-drills-v1'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedDrillsLibrary() {
  console.log(`Seeding ${CURATED_TENNIS_DRILLS_V1.length} drills...`)

  for (const drill of CURATED_TENNIS_DRILLS_V1) {
    const { error } = await supabase.from('drills_library').upsert(
      {
        slug: drill.slug,
        name: drill.name,
        primary_category: drill.primary_category,
        drill_type: drill.drill_type,
        checkpoints: drill.checkpoints,
        skill_level: drill.skill_level,
        bracket_recommendation: drill.bracket_recommendation,
        utr_recommendation: drill.utr_recommendation,
        duration_minutes: drill.duration_minutes,
        mode: drill.mode,
        requires: drill.requires,
        description: drill.description,
        steps: drill.steps,
        success_criteria: drill.success_criteria,
        coaching_cue: drill.coaching_cue,
        source: 'curated_playvia_v1',
        source_attribution: drill.source,
        is_public: true,
      },
      { onConflict: 'slug' },
    )

    if (error) {
      console.error(`Failed ${drill.slug}:`, error.message)
    } else {
      console.log(`✓ ${drill.slug}`)
    }
  }

  console.log('Seed complete.')
}

seedDrillsLibrary().catch(e => {
  console.error(e)
  process.exit(1)
})
