import type { SupabaseClient } from '@supabase/supabase-js'

const UTR_BASE = 'https://api.utrsports.net'
const UTR_V2_BASE = 'https://app.universaltennis.com'

function getHeaders() {
  const jwt = process.env.UTR_JWT
  if (!jwt) throw new Error('UTR_JWT not set')
  return {
    Authorization: `Bearer ${jwt}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: 'https://app.utrsports.net',
    Referer: 'https://app.utrsports.net/',
  }
}

export type UTRSearchPlayer = {
  id: string
  name: string
  singlesUtr: number
  doublesUtr: number
  location: string
  age: number | null
  ageRange: string
  gender: string
  gradYear: string | null
  ratingStatus: string
  nationality: string
}

/** UTR search often returns 0 / "0.xx" for minors; read fallbacks from the hit payload. */
function parseUtrFromSearchSource(
  source: Record<string, unknown>,
  kind: 'singles' | 'doubles',
): number {
  const primary =
    kind === 'singles'
      ? Number(source.singlesUtr)
      : Number(source.doublesUtr)
  const displayRaw =
    kind === 'singles'
      ? String(source.singlesUtrDisplay || '')
      : String(source.doublesUtrDisplay || '')
  const myUtr =
    kind === 'singles'
      ? Number(source.myUtrSingles)
      : Number(source.myUtrDoubles)

  if (Number.isFinite(primary) && primary > 0) return primary

  if (displayRaw && !/^0\.xx$/i.test(displayRaw) && !/^0\.00$/.test(displayRaw)) {
    const fromDisplay = parseFloat(displayRaw)
    if (Number.isFinite(fromDisplay) && fromDisplay > 0) return fromDisplay
  }

  if (Number.isFinite(myUtr) && myUtr > 0) return myUtr

  const threeMonth = Number(source.threeMonthRating)
  if (kind === 'singles' && Number.isFinite(threeMonth) && threeMonth > 0) {
    return threeMonth
  }

  const changeDetails = source.threeMonthRatingChangeDetails as
    | { rating?: number }
    | undefined
  if (
    kind === 'singles' &&
    changeDetails?.rating != null &&
    changeDetails.rating > 0
  ) {
    return changeDetails.rating
  }

  return 0
}

export type UTRPlayerRating = {
  singlesUtr: number
  doublesUtr: number
  ratingStatus: string
  ratingProgress: number
  displayName: string
  gradYear: string | null
  location: string
  threeMonthRating: number | null
  threeMonthChange: number | null
}

export type UTRMatchRow = {
  date: string
  tournamentName: string
  sourceType: string
  opponentUtr: number
  opponentName: string
  playerWon: boolean
  round: string
}

export type UtrMatchEventLevel =
  | 'national'
  | 'sectional'
  | 'itf'
  | 'utr_event'
  | 'utr_flex'
  | 'college'
  | 'other'

export interface UtrMatchResult {
  matchId: string
  date: string
  eventId: string | null
  eventName: string | null
  eventDivision: string | null
  eventLocation: string | null
  eventLevel: UtrMatchEventLevel | null
  opponentUtrId: string
  opponentName: string
  opponentUtr: number | null
  playerUtr: number | null
  result: 'W' | 'L'
  score: string
  round: string | null
  sets: number
}

const UTR_MATCH_PACE_MS = 150

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function mapSourceTypeToEventLevel(sourceType: string): UtrMatchEventLevel | null {
  const s = sourceType.toLowerCase()
  if (s.includes('college') || s.includes('ncaa')) return 'college'
  if (s.includes('itf')) return 'itf'
  if (s.includes('sectional')) return 'sectional'
  if (s.includes('national') || s === 'sanctioned') return 'national'
  if (s.includes('flex')) return 'utr_flex'
  if (s.includes('utr')) return 'utr_event'
  return s ? 'other' : null
}

function countSetsFromScore(score: string): number {
  if (!score.trim()) return 0
  const parts = score.split(/\s+/).filter(p => /\d/.test(p))
  return parts.length > 0 ? parts.length : 0
}

function toIsoDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

type UtrResultPlayer = {
  id?: string | number
  firstName?: string
  lastName?: string
  singlesUtr?: number
}

function opponentFromResult(
  players: {
    winner1?: UtrResultPlayer
    winner2?: UtrResultPlayer
    loser1?: UtrResultPlayer
    loser2?: UtrResultPlayer
  } | undefined,
  pid: string,
  isWinner: boolean,
): UtrResultPlayer | null {
  if (!players) return null
  return isWinner
    ? players.loser1 || players.loser2 || null
    : players.winner1 || players.winner2 || null
}

function focalPlayerFromResult(
  players: {
    winner1?: UtrResultPlayer
    winner2?: UtrResultPlayer
    loser1?: UtrResultPlayer
    loser2?: UtrResultPlayer
  } | undefined,
  pid: string,
  isWinner: boolean,
): UtrResultPlayer | null {
  if (!players) return null
  if (isWinner) {
    if (String(players.winner1?.id) === pid) return players.winner1 ?? null
    if (String(players.winner2?.id) === pid) return players.winner2 ?? null
  } else {
    if (String(players.loser1?.id) === pid) return players.loser1 ?? null
    if (String(players.loser2?.id) === pid) return players.loser2 ?? null
  }
  return null
}

function utrFromPlayer(p: UtrResultPlayer | null): number | null {
  if (p?.singlesUtr != null && p.singlesUtr > 0) return p.singlesUtr
  return null
}

function formatUtrEventLocation(event: {
  location?: string | { display?: string; cityName?: string; stateName?: string }
  cityName?: string
  stateName?: string
  venue?: string
}): string | null {
  if (typeof event.location === 'string' && event.location.trim()) {
    return event.location.trim()
  }
  if (event.location && typeof event.location === 'object') {
    const display = event.location.display?.trim()
    if (display) return display
    const cityState = [event.location.cityName, event.location.stateName]
      .filter(Boolean)
      .join(', ')
    if (cityState) return cityState
  }
  const cityState = [event.cityName, event.stateName].filter(Boolean).join(', ')
  if (cityState) return cityState
  if (event.venue?.trim()) return event.venue.trim()
  return null
}

function parseV4MatchResults(
  data: Record<string, unknown>,
  utrPlayerId: string,
): UtrMatchResult[] {
  const matches: UtrMatchResult[] = []
  const pid = String(utrPlayerId)

  const events = (data.events || []) as Array<{
    id?: string | number
    eventId?: string | number
    name?: string
    location?: string | { display?: string; cityName?: string; stateName?: string }
    cityName?: string
    stateName?: string
    venue?: string
    draws?: Array<{
      name?: string
      division?: string
      category?: string
      genderAgeGroup?: string
      results?: Array<{
        id?: string | number
        matchId?: string | number
        outcome?: string
        isRejected?: boolean
        excludeFromRating?: boolean
        players?: {
          winner1?: UtrResultPlayer
          winner2?: UtrResultPlayer
          loser1?: UtrResultPlayer
          loser2?: UtrResultPlayer
        }
        date?: string
        sourceType?: string
        score?: string
        finalScore?: string
        scoreString?: string
        sets?: number
        setCount?: number
        round?: { name?: string }
      }>
    }>
  }>

  events.forEach(event => {
    const eventId =
      event.id != null
        ? String(event.id)
        : event.eventId != null
          ? String(event.eventId)
          : null
    const eventName = event.name || null
    const eventLocation = formatUtrEventLocation(event)

    ;(event.draws || []).forEach(draw => {
      const eventDivision =
        draw.name?.trim() ||
        draw.division?.trim() ||
        draw.category?.trim() ||
        draw.genderAgeGroup?.trim() ||
        null
      ;(draw.results || []).forEach(result => {
        if (
          result.outcome !== 'completed' ||
          result.isRejected ||
          result.excludeFromRating
        ) {
          return
        }

        const players = result.players
        const isWinner =
          String(players?.winner1?.id) === pid ||
          String(players?.winner2?.id) === pid
        const opponent = opponentFromResult(players, pid, isWinner)
        if (!opponent) return

        const focal = focalPlayerFromResult(players, pid, isWinner)

        const opponentUtrId = String(opponent.id ?? '')
        if (!opponentUtrId) return

        const score = String(
          result.score ?? result.finalScore ?? result.scoreString ?? '',
        )
        const sets =
          typeof result.sets === 'number'
            ? result.sets
            : typeof result.setCount === 'number'
              ? result.setCount
              : countSetsFromScore(score)

        const matchId = String(
          result.id ??
            result.matchId ??
            `${eventId ?? 'ev'}:${result.date ?? ''}:${opponentUtrId}:${result.round?.name ?? ''}`,
        )

        matches.push({
          matchId,
          date: toIsoDate(result.date || ''),
          eventId,
          eventName,
          eventDivision,
          eventLocation,
          eventLevel: mapSourceTypeToEventLevel(result.sourceType || ''),
          opponentUtrId,
          opponentName:
            `${opponent.firstName || ''} ${opponent.lastName || ''}`.trim(),
          opponentUtr: utrFromPlayer(opponent),
          playerUtr: utrFromPlayer(focal),
          result: isWinner ? 'W' : 'L',
          score,
          round: result.round?.name || null,
          sets,
        })
      })
    })
  })

  return matches.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

function utrMatchToLegacyRow(m: UtrMatchResult): UTRMatchRow {
  return {
    date: m.date,
    tournamentName: m.eventName || '',
    sourceType: m.eventLevel || 'other',
    opponentUtr: m.opponentUtr ?? 0,
    opponentName: m.opponentName,
    playerWon: m.result === 'W',
    round: m.round || '',
  }
}

export type ScheduleStrengthResult = {
  score: number
  avgOpponentUtr: number
  highestUtrBeaten: number
  qualityWins: number
  winRateVsHigher: number
  totalMatches: number
  sanctionedPct: number
  summary: string
}

export async function searchUTRPlayers(
  query: string,
): Promise<UTRSearchPlayer[]> {
  const res = await fetch(
    `${UTR_V2_BASE}/api/v2/search?query=${encodeURIComponent(query)}&top=8`,
    { headers: getHeaders() },
  )
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200)
    throw new Error(
      `UTR search failed: ${res.status}${detail ? ` — ${detail}` : ''}`,
    )
  }
  const raw = await res.text()
  if (!raw.trim()) {
    throw new Error('UTR search returned an empty response')
  }
  type UTRSearchHit = {
    source?: Record<string, unknown>
    id?: string
  }
  type UTRSearchResponse = {
    players?: { hits?: UTRSearchHit[] }
  }
  let data: UTRSearchResponse
  try {
    data = JSON.parse(raw) as UTRSearchResponse
  } catch {
    throw new Error('UTR search returned invalid JSON')
  }
  const players = (data.players?.hits ?? []).map(h => {
    const source = (h.source || {}) as Record<string, unknown>
    const location = source.location as { display?: string } | undefined
    return {
      id: String(source.id ?? h.id ?? ''),
      name:
        String(source.displayName || '') ||
        `${source.firstName || ''} ${source.lastName || ''}`.trim(),
      singlesUtr: parseUtrFromSearchSource(source, 'singles'),
      doublesUtr: parseUtrFromSearchSource(source, 'doubles'),
      location: location?.display || '',
      age: (source.age as number) ?? null,
      ageRange: String(source.ageRange || ''),
      gender: String(source.gender || ''),
      gradYear: source.gradYearHighSchool
        ? String(source.gradYearHighSchool)
        : null,
      ratingStatus: String(source.ratingStatusSingles || ''),
      nationality: String(source.nationality || ''),
    }
  })

  // Search masks some junior profiles as 0; player detail has the real rating.
  await Promise.all(
    players.map(async player => {
      if (player.singlesUtr > 0) return
      const full = await fetchUTRPlayer(player.id)
      if (full && full.singlesUtr > 0) {
        player.singlesUtr = full.singlesUtr
        player.doublesUtr =
          full.doublesUtr > 0 ? full.doublesUtr : full.singlesUtr
      }
    }),
  )

  return players
}

export async function fetchUTRPlayer(
  utrPlayerId: string,
): Promise<UTRPlayerRating | null> {
  const res = await fetch(
    `${UTR_V2_BASE}/api/v2/player/${utrPlayerId}`,
    { headers: getHeaders() },
  )
  if (!res.ok) return null
  const p = await res.json()
  const changeDetails = p.threeMonthRatingChangeDetails as
    | { ratingDifference?: number }
    | undefined
  const singlesUtr =
    Number(p.singlesUtr) > 0
      ? Number(p.singlesUtr)
      : parseUtrFromSearchSource(p as Record<string, unknown>, 'singles')
  const doublesUtr =
    Number(p.doublesUtr) > 0
      ? Number(p.doublesUtr)
      : parseUtrFromSearchSource(p as Record<string, unknown>, 'doubles')

  return {
    singlesUtr,
    doublesUtr: doublesUtr > 0 ? doublesUtr : singlesUtr,
    ratingStatus: p.ratingStatusSingles || '',
    ratingProgress: p.ratingProgressSingles || 0,
    displayName: p.displayName || '',
    gradYear: p.gradYearHighSchool
      ? String(p.gradYearHighSchool)
      : null,
    location: p.location?.display || '',
    threeMonthRating: p.threeMonthRating ?? null,
    threeMonthChange: changeDetails?.ratingDifference ?? null,
  }
}

/**
 * Full match history from UTR (last ~24 months per UTR `year=last` window).
 */
export async function getPlayerMatchHistory(
  utrPlayerId: string,
  options?: { since?: string },
): Promise<UtrMatchResult[]> {
  const res = await fetch(
    `${UTR_BASE}/v4/player/${utrPlayerId}/results?type=s&year=last`,
    { headers: getHeaders() },
  )
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200)
    throw new Error(
      `UTR match history failed: ${res.status}${detail ? ` — ${detail}` : ''}`,
    )
  }

  const data = (await res.json()) as Record<string, unknown>
  let matches = parseV4MatchResults(data, utrPlayerId)

  if (options?.since) {
    const sinceMs = new Date(options.since).getTime()
    if (Number.isFinite(sinceMs)) {
      matches = matches.filter(m => new Date(m.date).getTime() >= sinceMs)
    }
  }

  await sleep(UTR_MATCH_PACE_MS)
  return matches
}

/** @deprecated Prefer `getPlayerMatchHistory` — kept for schedule-strength callers. */
export async function fetchUTRResults(
  utrPlayerId: string,
): Promise<UTRMatchRow[]> {
  try {
    const matches = await getPlayerMatchHistory(utrPlayerId)
    return matches.map(utrMatchToLegacyRow)
  } catch {
    return []
  }
}

export function calcScheduleStrength(
  matches: UTRMatchRow[],
  playerUtr: number,
): ScheduleStrengthResult {
  if (!matches.length) {
    return {
      score: 0,
      avgOpponentUtr: 0,
      highestUtrBeaten: 0,
      qualityWins: 0,
      winRateVsHigher: 0,
      totalMatches: 0,
      sanctionedPct: 0,
      summary: 'No match history available.',
    }
  }

  const wins = matches.filter(m => m.playerWon)
  const utrs = matches.map(m => m.opponentUtr).filter(u => u > 0)

  const avgOpponentUtr = utrs.length
    ? Math.round(
        (utrs.reduce((s, u) => s + u, 0) / utrs.length) * 100,
      ) / 100
    : 0

  const highestUtrBeaten =
    wins.length > 0 ? Math.max(...wins.map(m => m.opponentUtr)) : 0

  const qualityWins = wins.filter(m => m.opponentUtr > playerUtr).length

  const vsHigher = matches.filter(m => m.opponentUtr > playerUtr)
  const winRateVsHigher = vsHigher.length
    ? Math.round(
        (vsHigher.filter(m => m.playerWon).length / vsHigher.length) * 100,
      )
    : 0

  const sanctioned = matches.filter(m => m.sourceType === 'sanctioned').length
  const sanctionedPct = Math.round((sanctioned / matches.length) * 100)

  const utrDiff = avgOpponentUtr - playerUtr
  const utrScore = Math.min(Math.max(50 + utrDiff * 20, 0), 100)
  const qualityScore = Math.min(qualityWins * 15, 100)

  const score = Math.round(
    utrScore * 0.35 +
      qualityScore * 0.3 +
      winRateVsHigher * 0.2 +
      sanctionedPct * 0.15,
  )

  let summary = ''
  if (qualityWins >= 3) {
    summary =
      `Strong schedule — ${qualityWins} wins ` +
      `against higher-rated opponents. ` +
      `Avg opponent UTR ${avgOpponentUtr}.`
  } else if (qualityWins >= 1) {
    summary =
      `Solid schedule with ` +
      `${qualityWins} quality win` +
      `${qualityWins > 1 ? 's' : ''} ` +
      `above current level. ` +
      `Avg opponent UTR ${avgOpponentUtr}.`
  } else {
    summary =
      `Schedule needs stronger opponents. ` +
      `Avg opponent UTR ${avgOpponentUtr}. ` +
      `Playing L1/L2 events would help.`
  }

  return {
    score,
    avgOpponentUtr,
    highestUtrBeaten,
    qualityWins,
    winRateVsHigher,
    totalMatches: matches.length,
    sanctionedPct,
    summary,
  }
}

export async function runPlayerUTRSync(
  supabase: SupabaseClient,
  playerId: string,
  utrPlayerId: string,
) {
  const [playerData, matches] = await Promise.all([
    fetchUTRPlayer(utrPlayerId),
    fetchUTRResults(utrPlayerId),
  ])

  if (!playerData) {
    return { error: 'Player not found in UTR' }
  }

  const scheduleStrength = calcScheduleStrength(
    matches,
    playerData.singlesUtr,
  )

  const gradYearParsed = playerData.gradYear
    ? parseInt(String(playerData.gradYear), 10)
    : null

  await supabase
    .from('players')
    .update({
      utr_player_id: utrPlayerId,
      utr_singles: playerData.singlesUtr,
      utr_doubles: playerData.doublesUtr,
      utr_status: playerData.ratingStatus,
      utr_last_synced: new Date().toISOString(),
    })
    .eq('id', playerId)

  const { data: existingProfile } = await supabase
    .from('recruiting_profiles')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle()

  if (!existingProfile) {
    await supabase.from('recruiting_profiles').insert({
      player_id: playerId,
      wizard_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  if (playerData.singlesUtr != null) {
    const { updateJourneyInput } = await import('./journey-inputs')
    try {
      await updateJourneyInput({
        playerId,
        category: 'tennis',
        inputKey: 'utr_rating',
        valueNumeric: playerData.singlesUtr,
        unit: 'utr_points',
        source: 'utr_api',
        verified: true,
        actor: 'utr-sync',
        triggerRecalc: true,
      })
    } catch (e) {
      console.error('[utr] journey input/recalc after sync failed:', e)
    }
  }

  await supabase
    .from('recruiting_profiles')
    .update({
      utr_player_id: utrPlayerId,
      utr_singles: playerData.singlesUtr,
      utr_doubles: playerData.doublesUtr,
      utr_status: playerData.ratingStatus,
      utr_player_id_v4: utrPlayerId,
      utr_display_name: playerData.displayName,
      grad_year: Number.isFinite(gradYearParsed) ? gradYearParsed : null,
      schedule_strength_score: scheduleStrength.score,
      schedule_avg_opponent_utr: scheduleStrength.avgOpponentUtr,
      schedule_highest_utr_beaten: scheduleStrength.highestUtrBeaten,
      schedule_quality_wins: scheduleStrength.qualityWins,
      schedule_win_rate_vs_higher: scheduleStrength.winRateVsHigher,
      schedule_sanctioned_pct: scheduleStrength.sanctionedPct,
      schedule_total_matches: scheduleStrength.totalMatches,
      schedule_summary: scheduleStrength.summary,
      schedule_last_calculated: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })
    .eq('player_id', playerId)

  return {
    utr: {
      singlesUtr: playerData.singlesUtr,
      doublesUtr: playerData.doublesUtr,
      ratingStatus: playerData.ratingStatus,
      displayName: playerData.displayName,
    },
    scheduleStrength,
  }
}
