import type { SupabaseClient } from '@supabase/supabase-js'
import { computePlayerTrajectory } from '@/lib/utr-forecast'

/**
 * Recompute college match suggestions when targeting or birth_date changes.
 * Invalidates cached Via school lists and refreshes trajectory inputs.
 */
export async function recomputeCollegeMatchesForPlayer(
  supabase: SupabaseClient,
  playerId: string,
): Promise<{ ok: boolean; forecastUtr: number | null }> {
  const [{ data: player }, { data: prefs }, { data: recruiting }, { data: utrInput }] =
    await Promise.all([
      supabase
        .from('players')
        .select('birth_date, utr_singles')
        .eq('id', playerId)
        .maybeSingle(),
      supabase
        .from('journey_preferences')
        .select('target_division, target_academic_tier, target_geography')
        .eq('player_id', playerId)
        .maybeSingle(),
      supabase
        .from('recruiting_profiles')
        .select('grad_year, via_suggested_schools')
        .eq('player_id', playerId)
        .maybeSingle(),
      supabase
        .from('journey_score_inputs')
        .select('value_numeric')
        .eq('player_id', playerId)
        .eq('category', 'tennis')
        .eq('input_key', 'utr_rating')
        .maybeSingle(),
    ])

  const gradYear = recruiting?.grad_year ?? null
  const currentUtr =
    utrInput?.value_numeric != null
      ? Number(utrInput.value_numeric)
      : player?.utr_singles != null
        ? Number(player.utr_singles)
        : null

  const trajectory = computePlayerTrajectory({
    birthDate: player?.birth_date ?? null,
    gradYear,
    currentUtr,
  })

  // Invalidate cached school suggestions — M5 / Via will refresh on next request.
  if (recruiting?.via_suggested_schools != null) {
    await supabase
      .from('recruiting_profiles')
      .update({
        via_suggested_schools: null,
        projection_generated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId)
  }

  void prefs

  return {
    ok: true,
    forecastUtr: trajectory.forecastUtrAtGraduation,
  }
}

export function scheduleCollegeMatchRecompute(
  supabase: SupabaseClient,
  playerId: string,
): void {
  recomputeCollegeMatchesForPlayer(supabase, playerId).catch(e => {
    console.error('[college-match-recompute] failed:', playerId, e)
  })
}
