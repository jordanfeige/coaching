import type { SupabaseClient } from '@supabase/supabase-js'
import type { LibraryDrillRow } from '@/lib/drills-library'
import { sanitizeSearchQuery } from '@/lib/drills-library'

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'your',
  'this',
  'that',
  'from',
  'into',
  'under',
  'over',
  'when',
  'after',
  'before',
  'during',
  'match',
  'point',
  'points',
  'shot',
  'shots',
  'ball',
  'court',
  'player',
  'play',
  'aggressive',
])

/** Map work-on language to library primary_category when token alone is ambiguous. */
const TOPIC_TO_CATEGORY: Record<string, string> = {
  net: 'Volley',
  volley: 'Volley',
  approach: 'Volley',
  overhead: 'Volley',
  serve: 'Serve',
  forehand: 'Forehand',
  backhand: 'Backhand',
  footwork: 'Footwork',
  movement: 'Footwork',
  mental: 'Mental',
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

function scoreDrill(
  drill: Pick<
    LibraryDrillRow,
    'name' | 'description' | 'primary_category' | 'checkpoints' | 'coaching_cue'
  >,
  tokens: string[],
): number {
  const haystack = [
    drill.name,
    drill.description,
    drill.primary_category,
    drill.coaching_cue ?? '',
    ...(drill.checkpoints ?? []),
  ]
    .join(' ')
    .toLowerCase()

  let score = 0
  for (const t of tokens) {
    if (haystack.includes(t)) score += 2
    if (drill.name.toLowerCase().includes(t)) score += 3
    if (drill.primary_category.toLowerCase().includes(t)) score += 1
  }
  return score
}

/** Library-matched drills for a Film Room work_on item (no AI generation). */
export async function findDrillsForWorkOn(
  supabase: SupabaseClient,
  options: { title: string; interpretation?: string },
  limit = 3,
): Promise<LibraryDrillRow[]> {
  const combined = `${options.title} ${options.interpretation ?? ''}`.trim()
  const tokens = tokenize(combined)
  if (tokens.length === 0) return []

  const searchTokens = [...new Set(tokens)]
  const lower = combined.toLowerCase()
  if (searchTokens.includes('net') || lower.includes('net play') || lower.includes('at the net')) {
    searchTokens.push('volley', 'approach')
  }
  if (lower.includes('transition') || lower.includes('come in')) {
    searchTokens.push('approach', 'volley')
  }

  const selectCols =
    'id, slug, name, primary_category, drill_type, checkpoints, skill_level, duration_minutes, mode, requires, description, steps, success_criteria, coaching_cue, source, source_attribution, created_by_player_id, created_by_coach_id, is_public'

  // ANY-token search (Via-style ilike), not full-phrase — "Aggressive Net Play" must match "volley"/"approach"
  const orParts: string[] = []
  for (const t of searchTokens) {
    const safe = sanitizeSearchQuery(t)
    if (!safe) continue
    orParts.push(`name.ilike.%${safe}%`)
    orParts.push(`description.ilike.%${safe}%`)
    orParts.push(`coaching_cue.ilike.%${safe}%`)
  }

  let q = supabase.from('drills_library').select(selectCols).limit(40)

  if (orParts.length > 0) {
    q = q.or(orParts.join(','))
  }

  const topicToken = searchTokens.find(t => TOPIC_TO_CATEGORY[t])

  const { data, error } = await q
  if (error || !data?.length) {
    // Fallback: category-only browse for net/approach topics
    if (topicToken) {
      const { data: byCat } = await supabase
        .from('drills_library')
        .select(selectCols)
        .eq('primary_category', TOPIC_TO_CATEGORY[topicToken])
        .limit(limit)
      return (byCat as LibraryDrillRow[]) ?? []
    }
    return []
  }

  const ranked = (data as LibraryDrillRow[])
    .map(d => ({ drill: d, score: scoreDrill(d, tokens) }))
    .sort((a, b) => b.score - a.score)

  const withScore = ranked.filter(r => r.score > 0)
  const picks = (withScore.length > 0 ? withScore : ranked).slice(0, limit)
  return picks.map(r => r.drill)
}
