// src/lib/journey-recalc.ts
//
// Orchestrator: pulls inputs + benchmarks for a player, calls the
// pure calc, writes a new journey_ratings row, and logs an event.

import { createClient } from '@supabase/supabase-js'
import {
  calculateJourneyRating,
  type JourneyBenchmark,
  type JourneyBreakdown,
  type JourneyInput,
} from './journey-score'

type DbInputRow = {
  category: JourneyInput['category']
  input_key: string
  value_numeric: number | string | null
  value_text: string | null
  unit: string | null
  source: string
  verified: boolean
  captured_at: string
}

type DbBenchmarkRow = {
  sport: string
  division: string
  category: string
  metric: string
  value: number | string
  unit: string
}

function mapDbInput(row: DbInputRow): JourneyInput {
  return {
    category: row.category,
    input_key: row.input_key,
    value_numeric:
      row.value_numeric != null ? Number(row.value_numeric) : null,
    value_text: row.value_text,
    unit: row.unit,
    source: row.source,
    verified: row.verified,
    captured_at: row.captured_at,
  }
}

function mapDbBenchmark(row: DbBenchmarkRow): JourneyBenchmark {
  return {
    sport: row.sport,
    division: row.division,
    category: row.category,
    metric: row.metric,
    value: Number(row.value),
    unit: row.unit,
  }
}

export async function recalcJourneyRating(
  playerId: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<JourneyBreakdown> {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: inputRows, error: inputsErr } = await supabase
    .from('journey_score_inputs')
    .select(
      'category, input_key, value_numeric, value_text, unit, source, verified, captured_at',
    )
    .eq('player_id', playerId)

  if (inputsErr) throw inputsErr

  const { data: benchmarkRows, error: benchErr } = await supabase
    .from('journey_benchmarks')
    .select('sport, division, category, metric, value, unit')
    .eq('sport', 'tennis')
    .eq('active', true)

  if (benchErr) throw benchErr

  const { data: prev } = await supabase
    .from('journey_ratings')
    .select('total, tier')
    .eq('player_id', playerId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const inputs = (inputRows ?? []).map(row =>
    mapDbInput(row as DbInputRow),
  )
  const benchmarks = (benchmarkRows ?? []).map(row =>
    mapDbBenchmark(row as DbBenchmarkRow),
  )

  const breakdown = calculateJourneyRating(inputs, benchmarks)

  const { error: insertErr } = await supabase.from('journey_ratings').insert({
    player_id: playerId,
    total: breakdown.total,
    tier: breakdown.tier,
    tier_progress: breakdown.tier_progress,
    weights_version: breakdown.weights_version,
    breakdown,
  })

  if (insertErr) throw insertErr

  const delta = prev ? breakdown.total - Number(prev.total) : null

  const { error: eventErr } = await supabase
    .from('journey_score_events')
    .insert({
      player_id: playerId,
      event_type: 'rating_recalculated',
      label: prev
        ? `Rating ${prev.total} → ${breakdown.total}`
        : `Initial rating: ${breakdown.total}`,
      delta_score: delta,
      metadata: { weights_version: breakdown.weights_version },
      actor: 'system',
    })

  if (eventErr) throw eventErr

  if (prev && prev.tier !== breakdown.tier) {
    const { error: tierErr } = await supabase
      .from('journey_score_events')
      .insert({
        player_id: playerId,
        event_type: 'tier_changed',
        label: `Tier: ${prev.tier} → ${breakdown.tier}`,
        before_value: prev.tier,
        after_value: breakdown.tier,
        actor: 'system',
      })

    if (tierErr) throw tierErr
  }

  return breakdown
}
