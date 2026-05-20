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
  return (data.players?.hits ?? []).map(h => {
    const source = h.source || {}
      const location = source.location as { display?: string } | undefined
      return {
        id: String(source.id ?? h.id ?? ''),
        name:
          String(source.displayName || '') ||
          `${source.firstName || ''} ${source.lastName || ''}`.trim(),
        singlesUtr: Number(source.singlesUtr) || 0,
        doublesUtr: Number(source.doublesUtr) || 0,
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
  return {
    singlesUtr: p.singlesUtr || 0,
    doublesUtr: p.doublesUtr || 0,
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

export async function fetchUTRResults(
  utrPlayerId: string,
): Promise<UTRMatchRow[]> {
  const res = await fetch(
    `${UTR_BASE}/v4/player/${utrPlayerId}/results?type=s&year=last`,
    { headers: getHeaders() },
  )
  if (!res.ok) return []

  const data = await res.json()
  const matches: UTRMatchRow[] = []
  const pid = String(utrPlayerId)

  const events = (data.events || []) as Array<{
    name?: string
    draws?: Array<{
      results?: Array<{
        outcome?: string
        isRejected?: boolean
        excludeFromRating?: boolean
        players?: {
          winner1?: { id?: string | number; firstName?: string; lastName?: string; singlesUtr?: number }
          winner2?: { id?: string | number; firstName?: string; lastName?: string; singlesUtr?: number }
          loser1?: { id?: string | number; firstName?: string; lastName?: string; singlesUtr?: number }
          loser2?: { id?: string | number; firstName?: string; lastName?: string; singlesUtr?: number }
        }
        date?: string
        sourceType?: string
        round?: { name?: string }
      }>
    }>
  }>

  events.forEach(event => {
    ;(event.draws || []).forEach(draw => {
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

        const opponent = isWinner
          ? players?.loser1 || players?.loser2
          : players?.winner1 || players?.winner2

        if (!opponent) return

        matches.push({
          date: result.date || '',
          tournamentName: event.name || '',
          sourceType: result.sourceType || '',
          opponentUtr: opponent.singlesUtr || 0,
          opponentName:
            `${opponent.firstName || ''} ${opponent.lastName || ''}`.trim(),
          playerWon: isWinner,
          round: result.round?.name || '',
        })
      })
    })
  })

  return matches.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
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

  const { data: profile } = await supabase
    .from('recruiting_profiles')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle()

  if (profile) {
    await supabase
      .from('recruiting_profiles')
      .update({
        utr_singles: playerData.singlesUtr,
        utr_doubles: playerData.doublesUtr,
        utr_status: playerData.ratingStatus,
        utr_player_id: utrPlayerId,
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
      .eq('id', profile.id)
  }

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
