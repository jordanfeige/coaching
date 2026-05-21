import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { scheduleCollegeMatchRecompute } from '@/lib/college-match-recompute'
import { updateJourneyInput } from '@/lib/journey-inputs'
import { recalcJourneyRating } from '@/lib/journey-recalc'

export type ProfileUpdateField =
  | 'birth_date'
  | 'class_year'
  | 'sport'
  | 'skill_level'
  | 'gpa'
  | 'sat'
  | 'act'
  | 'goal'
  | 'target_division'
  | 'target_academic_tier'
  | 'target_geography'
  | 'target_state'
  | 'not_recruiting'

type RecalcRule = {
  triggerRating: boolean
  triggerMatches: boolean
}

const RECALC_RULES: Record<ProfileUpdateField, RecalcRule> = {
  birth_date: { triggerRating: false, triggerMatches: true },
  class_year: { triggerRating: false, triggerMatches: true },
  sport: { triggerRating: true, triggerMatches: false },
  skill_level: { triggerRating: false, triggerMatches: false },
  gpa: { triggerRating: true, triggerMatches: true },
  sat: { triggerRating: true, triggerMatches: true },
  act: { triggerRating: true, triggerMatches: true },
  goal: { triggerRating: false, triggerMatches: true },
  target_division: { triggerRating: false, triggerMatches: true },
  target_academic_tier: { triggerRating: false, triggerMatches: true },
  target_geography: { triggerRating: false, triggerMatches: true },
  target_state: { triggerRating: false, triggerMatches: true },
  not_recruiting: { triggerRating: false, triggerMatches: true },
}

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service env')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function parseGradYear(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const s = String(value)
  if (s.includes('2030')) return 2030
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

export function validateProfileField(
  field: ProfileUpdateField,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (field) {
    case 'birth_date': {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { ok: false, error: 'Birth date must be YYYY-MM-DD' }
      }
      const d = new Date(`${value}T12:00:00`)
      const now = new Date()
      const min = new Date('1970-01-01T12:00:00')
      if (Number.isNaN(d.getTime()) || d > now || d < min) {
        return { ok: false, error: 'Birth date must be between 1970 and today' }
      }
      return { ok: true, value }
    }
    case 'class_year': {
      const year = parseGradYear(value)
      if (year == null) return { ok: false, error: 'Invalid class year' }
      const max = new Date().getFullYear() + 10
      if (year < new Date().getFullYear() || year > max) {
        return { ok: false, error: `Class year must be ${new Date().getFullYear()}–${max}` }
      }
      return { ok: true, value: year }
    }
    case 'sport': {
      const allowed = ['tennis', 'golf', 'baseball', 'basketball', 'pickleball']
      if (typeof value !== 'string' || !allowed.includes(value)) {
        return { ok: false, error: 'Invalid sport' }
      }
      return { ok: true, value }
    }
    case 'skill_level': {
      const allowed = ['Beginner', 'Intermediate', 'Advanced']
      if (typeof value !== 'string' || !allowed.includes(value)) {
        return { ok: false, error: 'Invalid skill level' }
      }
      return { ok: true, value }
    }
    case 'gpa': {
      if (value === '' || value == null) return { ok: true, value: null }
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0 || n > 4.5) {
        return { ok: false, error: 'GPA must be between 0 and 4.5' }
      }
      return { ok: true, value: Math.round(n * 100) / 100 }
    }
    case 'sat': {
      if (value === '' || value == null) return { ok: true, value: null }
      const n = Number(value)
      if (!Number.isFinite(n) || n < 400 || n > 1600) {
        return { ok: false, error: 'SAT must be between 400 and 1600' }
      }
      return { ok: true, value: Math.round(n) }
    }
    case 'act': {
      if (value === '' || value == null) return { ok: true, value: null }
      const n = Number(value)
      if (!Number.isFinite(n) || n < 1 || n > 36) {
        return { ok: false, error: 'ACT must be between 1 and 36' }
      }
      return { ok: true, value: Math.round(n) }
    }
    case 'goal': {
      const allowed = [
        'recruited_college',
        'scholarship_smaller',
        'win_highest_level',
        'improve_have_fun',
        'help_my_child',
        'not_sure_yet',
      ]
      if (typeof value !== 'string' || !allowed.includes(value)) {
        return { ok: false, error: 'Invalid goal' }
      }
      return { ok: true, value }
    }
    case 'target_division': {
      const allowed = [
        'd1_power',
        'd1_mid_major',
        'd2',
        'd3',
        'naia',
        'juco',
        'not_sure',
      ]
      if (value === '' || value == null) return { ok: true, value: null }
      if (typeof value !== 'string' || !allowed.includes(value)) {
        return { ok: false, error: 'Invalid division' }
      }
      return { ok: true, value }
    }
    case 'target_academic_tier': {
      const allowed = [
        'ivy',
        'top_25_academic',
        'top_100_academic',
        'public_state',
        'no_preference',
      ]
      if (value === '' || value == null) return { ok: true, value: null }
      if (typeof value !== 'string' || !allowed.includes(value)) {
        return { ok: false, error: 'Invalid academic tier' }
      }
      return { ok: true, value }
    }
    case 'target_geography': {
      const allowed = ['anywhere', 'specific_state', 'specific_region']
      if (value === '' || value == null) return { ok: true, value: null }
      if (typeof value !== 'string' || !allowed.includes(value)) {
        return { ok: false, error: 'Invalid geography' }
      }
      return { ok: true, value }
    }
    case 'target_state': {
      if (value === '' || value == null) return { ok: true, value: null }
      const s = String(value).trim().toUpperCase()
      if (!/^[A-Z]{2}$/.test(s)) {
        return { ok: false, error: 'State must be a 2-letter code (e.g. CA)' }
      }
      return { ok: true, value: s }
    }
    case 'not_recruiting': {
      if (typeof value !== 'boolean') {
        return { ok: false, error: 'Invalid recruiting toggle' }
      }
      return { ok: true, value }
    }
    default:
      return { ok: false, error: 'Unknown field' }
  }
}

async function runRecalcs(playerId: string, rule: RecalcRule): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  const tasks: Promise<unknown>[] = []
  if (rule.triggerRating) {
    tasks.push(recalcJourneyRating(playerId, url, key))
  }
  if (rule.triggerMatches) {
    tasks.push(
      Promise.resolve(scheduleCollegeMatchRecompute(serviceClient(), playerId)),
    )
  }
  await Promise.allSettled(tasks)
}

export async function applyProfileFieldUpdate(
  playerId: string,
  field: ProfileUpdateField,
  value: unknown,
): Promise<void> {
  const validated = validateProfileField(field, value)
  if (!validated.ok) throw new Error(validated.error)

  const service = serviceClient()
  const v = validated.value
  const now = new Date().toISOString()

  switch (field) {
    case 'birth_date': {
      const { error } = await service
        .from('players')
        .update({ birth_date: v as string })
        .eq('id', playerId)
      if (error) throw error
      break
    }
    case 'class_year': {
      const gradYear = v as number
      const { data: existing } = await service
        .from('recruiting_profiles')
        .select('id')
        .eq('player_id', playerId)
        .maybeSingle()
      if (existing) {
        const { error } = await service
          .from('recruiting_profiles')
          .update({ grad_year: gradYear, updated_at: now })
          .eq('player_id', playerId)
        if (error) throw error
      } else {
        const { error } = await service.from('recruiting_profiles').insert({
          player_id: playerId,
          grad_year: gradYear,
          created_at: now,
          updated_at: now,
        })
        if (error) throw error
      }
      break
    }
    case 'sport': {
      const { error } = await service
        .from('players')
        .update({ sport: v as string })
        .eq('id', playerId)
      if (error) throw error
      break
    }
    case 'skill_level': {
      const { error } = await service
        .from('players')
        .update({ skill_level: v as string })
        .eq('id', playerId)
      if (error) throw error
      break
    }
    case 'gpa':
    case 'sat':
    case 'act': {
      if (v == null) {
        const { error } = await service
          .from('journey_score_inputs')
          .delete()
          .eq('player_id', playerId)
          .eq('category', 'academics')
          .eq('input_key', field)
        if (error) throw error
      } else {
        await updateJourneyInput({
          playerId,
          category: 'academics',
          inputKey: field,
          valueNumeric: v as number,
          unit: field,
          source: 'self_reported',
          verified: false,
          actor: 'player',
          triggerRecalc: false,
        })
      }
      break
    }
    case 'goal': {
      const { error } = await service.from('journey_preferences').upsert(
        {
          player_id: playerId,
          primary_goal: v as string,
          goal_set_at: now,
          updated_at: now,
        },
        { onConflict: 'player_id' },
      )
      if (error) throw error
      break
    }
    case 'target_division':
    case 'target_academic_tier':
    case 'target_geography':
    case 'target_state':
    case 'not_recruiting': {
      const patch: Record<string, unknown> = {
        player_id: playerId,
        updated_at: now,
        [field]: v,
      }
      if (field === 'not_recruiting' && v === true) {
        patch.recruiting_banner_dismissed = true
      }
      const { error } = await service
        .from('journey_preferences')
        .upsert(patch, { onConflict: 'player_id' })
      if (error) throw error
      break
    }
  }

  const rule = RECALC_RULES[field]
  if (field === 'gpa' || field === 'sat' || field === 'act') {
    await runRecalcs(playerId, rule)
  } else {
    void runRecalcs(playerId, rule)
  }
}
