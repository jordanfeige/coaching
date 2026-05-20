// src/lib/journey-inputs.ts

import { createClient } from '@supabase/supabase-js'
import { recalcJourneyRating } from './journey-recalc'

export interface UpdateInputArgs {
  playerId: string
  category: 'tennis' | 'academics' | 'exposure' | 'coachability'
  inputKey: string
  valueNumeric?: number | null
  valueText?: string | null
  unit?: string
  source: string
  verified?: boolean
  actor?: string
  triggerRecalc?: boolean
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export async function updateJourneyInput(args: UpdateInputArgs) {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: prev } = await supabase
    .from('journey_score_inputs')
    .select('value_numeric, value_text, verified')
    .eq('player_id', args.playerId)
    .eq('category', args.category)
    .eq('input_key', args.inputKey)
    .maybeSingle()

  const { error: upsertErr } = await supabase.from('journey_score_inputs').upsert(
    {
      player_id: args.playerId,
      category: args.category,
      input_key: args.inputKey,
      value_numeric: args.valueNumeric ?? null,
      value_text: args.valueText ?? null,
      unit: args.unit ?? null,
      source: args.source,
      verified: args.verified ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id,category,input_key' },
  )

  if (upsertErr) throw upsertErr

  const beforeStr = prev?.value_numeric?.toString() ?? prev?.value_text ?? '—'
  const afterStr = args.valueNumeric?.toString() ?? args.valueText ?? '—'

  const { error: eventErr } = await supabase.from('journey_score_events').insert({
    player_id: args.playerId,
    event_type: prev ? 'input_updated' : 'input_added',
    category: args.category,
    label: `${args.inputKey}: ${beforeStr} → ${afterStr}`,
    before_value: beforeStr,
    after_value: afterStr,
    metadata: { source: args.source, verified: args.verified ?? false },
    actor: args.actor ?? 'system',
  })

  if (eventErr) throw eventErr

  if (prev && !prev.verified && args.verified) {
    const { error: verifyErr } = await supabase
      .from('journey_score_events')
      .insert({
        player_id: args.playerId,
        event_type: 'input_verified',
        category: args.category,
        label: `${args.inputKey} verified`,
        actor: args.actor ?? 'system',
      })

    if (verifyErr) throw verifyErr
  }

  if (args.triggerRecalc !== false) {
    await recalcJourneyRating(args.playerId, supabaseUrl, serviceKey)
  }
}
