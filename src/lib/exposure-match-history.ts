import {
  bracketForAge,
  computeAgeAt,
  yearInBracketForAge,
} from '@/lib/utr-forecast'

export type ExposureMatchRow = {
  id: string
  match_date: string
  opponent_name: string | null
  opponent_utr_at_time: number | null
  player_utr_at_time: number | null
  event_division: string | null
  event_level: string | null
  event_name: string | null
  event_location: string | null
  result: 'W' | 'L'
}

export type CohortBenchmarkRow = {
  bracket: string
  year_in_bracket: number
  utr_threshold: number
}

function cohortMap(rows: CohortBenchmarkRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(`${row.bracket}:${row.year_in_bracket}`, row.utr_threshold)
  }
  return map
}

/** Mirrors `scoreExposure()` quality-win definition (cohort peer UTR at match age). */
export function peerUtrAtMatch(
  birthDate: string,
  matchDate: string,
  peers: Map<string, number>,
): number | null {
  const age = computeAgeAt(birthDate, new Date(`${matchDate}T12:00:00`))
  const bracket = bracketForAge(age)
  const year = yearInBracketForAge(age)
  return peers.get(`${bracket}:${year}`) ?? null
}

export function isExposureQualityWin(
  match: ExposureMatchRow,
  birthDate: string | null,
  peers: Map<string, number>,
): boolean {
  if (match.result !== 'W') return false
  if (match.opponent_utr_at_time == null || !birthDate) return false
  const peerBar = peerUtrAtMatch(birthDate, match.match_date, peers)
  if (peerBar == null) return false
  return match.opponent_utr_at_time >= peerBar
}

export function categorizeExposureMatches(
  matches: ExposureMatchRow[],
  birthDate: string | null,
  cohortBenchmarks: CohortBenchmarkRow[],
) {
  const peers = cohortMap(cohortBenchmarks)
  const wins = matches.filter(m => m.result === 'W')
  const losses = matches.filter(m => m.result === 'L')

  const qualityWins = wins.filter(m => isExposureQualityWin(m, birthDate, peers))
  const qualityIds = new Set(qualityWins.map(m => m.id))
  const otherWins = wins.filter(m => !qualityIds.has(m.id))

  return {
    quality_wins: qualityWins,
    other_wins: otherWins,
    losses,
  }
}

export function playerBracketFromBirthDate(
  birthDate: string | null | undefined,
): string | null {
  if (!birthDate) return null
  try {
    return bracketForAge(computeAgeAt(birthDate, new Date()))
  } catch {
    return null
  }
}

export function parseBracketAge(label: string): number | null {
  const match = label.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

export function isPlayingUp(
  playerBracket: string | null,
  eventDivision: string | null,
): boolean {
  if (!playerBracket || !eventDivision) return false
  const playerAge = parseBracketAge(playerBracket)
  const eventAge = parseBracketAge(eventDivision)
  if (playerAge == null || eventAge == null) return false
  return playerAge < eventAge
}

export function eventLevelStyle(level: string | null): {
  color: string
  background: string
} {
  if (!level) return { color: '#666', background: 'rgba(102,102,102,0.1)' }
  const lower = level.toLowerCase()
  if (lower.includes('national')) {
    return { color: '#534AB7', background: 'rgba(83,74,183,0.1)' }
  }
  if (lower.includes('section')) {
    return { color: '#854F0B', background: 'rgba(133,79,11,0.1)' }
  }
  return { color: '#666', background: 'rgba(102,102,102,0.1)' }
}

export function formatMatchDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatEventLevelLabel(level: string | null): string | null {
  if (!level) return null
  if (level === 'utr_event') return 'UTR event'
  if (level === 'utr_flex') return 'UTR flex'
  return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, ' ')
}
