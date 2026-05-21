// src/lib/journey-inputs.ts

import { createClient } from '@supabase/supabase-js'
import { triggerCollegeMatchRecomputeApi } from '@/lib/college-match-recompute'
import { recalcJourneyRating } from './journey-recalc'

const MATCHING_INPUT_KEYS = new Set(['utr_rating', 'gpa', 'sat'])

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

function formatInputValue(
  valueNumeric: number | string | null | undefined,
  valueText: string | null | undefined,
): string {
  if (valueNumeric != null && valueNumeric !== '') {
    return String(Number(valueNumeric))
  }
  return valueText ?? '—'
}

function valuesChanged(
  prev: { value_numeric: number | string | null; value_text: string | null },
  args: UpdateInputArgs,
): boolean {
  const prevNum =
    prev.value_numeric != null ? Number(prev.value_numeric) : null
  const nextNum =
    args.valueNumeric != null ? Number(args.valueNumeric) : null
  if (prevNum !== nextNum) return true
  return (prev.value_text ?? null) !== (args.valueText ?? null)
}

export async function updateJourneyInput(args: UpdateInputArgs) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: prev } = await supabase
    .from('journey_score_inputs')
    .select('value_numeric, value_text, verified, source')
    .eq('player_id', args.playerId)
    .eq('category', args.category)
    .eq('input_key', args.inputKey)
    .maybeSingle()

  const beforeStr = prev
    ? formatInputValue(prev.value_numeric, prev.value_text)
    : '—'
  const afterStr = formatInputValue(args.valueNumeric, args.valueText)

  const wasVerified = prev?.verified ?? false
  const isNewInput = !prev
  const valueChanged = prev ? valuesChanged(prev, args) : false
  const verificationChanged =
    prev && wasVerified !== (args.verified ?? false)

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

  if (upsertErr) {
    console.error('updateJourneyInput upsert failed:', upsertErr)
    throw upsertErr
  }

  if (isNewInput) {
    const { error: eventErr } = await supabase.from('journey_score_events').insert({
      player_id: args.playerId,
      event_type: 'input_added',
      category: args.category,
      label: `${args.inputKey} added: ${afterStr}`,
      before_value: null,
      after_value: afterStr,
      metadata: { source: args.source, verified: args.verified ?? false },
      actor: args.actor ?? 'system',
    })
    if (eventErr) throw eventErr
  } else if (valueChanged) {
    const { error: eventErr } = await supabase.from('journey_score_events').insert({
      player_id: args.playerId,
      event_type: 'input_updated',
      category: args.category,
      label: `${args.inputKey}: ${beforeStr} → ${afterStr}`,
      before_value: beforeStr,
      after_value: afterStr,
      metadata: { source: args.source, verified: args.verified ?? false },
      actor: args.actor ?? 'system',
    })
    if (eventErr) throw eventErr
  }

  if (verificationChanged && !wasVerified && args.verified) {
    const { error: verifyErr } = await supabase
      .from('journey_score_events')
      .insert({
        player_id: args.playerId,
        event_type: 'input_verified',
        category: args.category,
        label: `${args.inputKey} verified`,
        before_value: 'self-reported',
        after_value: args.source,
        actor: args.actor ?? 'system',
      })
    if (verifyErr) throw verifyErr
  }

  const shouldRecalc =
    args.triggerRecalc !== false &&
    (isNewInput || valueChanged || verificationChanged)

  if (shouldRecalc) {
    await recalcJourneyRating(
      args.playerId,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }

  if (
    MATCHING_INPUT_KEYS.has(args.inputKey) &&
    (isNewInput || valueChanged)
  ) {
    triggerCollegeMatchRecomputeApi(args.playerId)
  }
}
