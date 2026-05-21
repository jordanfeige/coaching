/**
 * UTR college team + roster API (api.utrsports.net).
 * Used by recruiting college sync and journey benchmark roster sync.
 */

const UTR_BASE = 'https://api.utrsports.net'

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

export type CollegeTeam = {
  clubId: string
  name: string
  gender: string
  divisionName: string
  conferenceName: string
  /** Present on college search hits when UTR embeds roster in `source.school.roster`. */
  embeddedRoster?: CollegeRosterPlayer[]
}

function parseEmbeddedRoster(
  raw: unknown,
): CollegeRosterPlayer[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const players = (raw as Array<Record<string, unknown>>)
    .map(p => ({
      singlesUtr: Number(p.singlesUtr) || 0,
      nationality: p.nationality ? String(p.nationality) : null,
    }))
    .filter(p => p.singlesUtr > 0 && p.singlesUtr < 17)
  return players.length > 0 ? players : undefined
}

export type CollegeRosterPlayer = {
  singlesUtr: number
  nationality: string | null
}

export type CollegeSchoolRoster = {
  rosterYear: string | null
  players: CollegeRosterPlayer[]
}

export interface UtrCollegeRoster {
  schoolUtrId: string
  schoolName: string
  division: string | null
  conference: string | null
  rosterPlayers: {
    utrId: string
    name: string
    utr: number
    classYear: number | null
    position: string | null
  }[]
  asOf: string
}

export type CollegeTeamSearchHit = {
  schoolUtrId: string
  name: string
  division: string
}

function normalizeUtrDivisionLabel(
  divisionName: string,
  conferenceName: string,
): string | null {
  const journey = mapCollegeToJourneyDivision(divisionName, conferenceName)
  if (!journey) return null
  if (journey === 'd1_power' || journey === 'd1_mid_major') return 'd1'
  return journey
}

function parseRosterPlayer(
  p: Record<string, unknown>,
): UtrCollegeRoster['rosterPlayers'][number] | null {
  const utr = Number(p.singlesUtr) || 0
  if (utr <= 0 || utr >= 17) return null
  const utrId = String(p.id ?? p.playerId ?? '')
  if (!utrId) return null
  const name =
    String(p.displayName || '') ||
    `${p.firstName || ''} ${p.lastName || ''}`.trim()
  if (!name) return null

  const gradRaw = p.gradYear ?? p.graduationYear ?? p.classYear
  const classYear =
    gradRaw != null && Number.isFinite(Number(gradRaw))
      ? Number(gradRaw)
      : null

  const positionRaw = p.position ?? p.lineupPosition ?? p.rosterPosition
  const position = positionRaw ? String(positionRaw).toLowerCase() : null

  return {
    utrId,
    name,
    utr,
    classYear,
    position,
  }
}

/** Paginated NCAA college tennis program search. */
export async function listAllCollegeTeams(options?: {
  maxPages?: number
  pageSize?: number
  delayMs?: number
}): Promise<CollegeTeam[]> {
  const pageSize = options?.pageSize ?? 100
  const maxPages = options?.maxPages ?? 5
  const delayMs = options?.delayMs ?? 200
  const allClubs: CollegeTeam[] = []
  let skip = 0
  let total = Infinity
  let pages = 0

  while (skip < total && pages < maxPages) {
    const res = await fetch(
      `${UTR_BASE}/v2/search/colleges` +
        `?top=${pageSize}&skip=${skip}` +
        `&utrType=verified` +
        `&utrTeamType=singles` +
        `&schoolClubSearch=true` +
        `&sort=name%3Adesc` +
        `&searchOrigin=searchPage`,
      { headers: getHeaders() },
    )

    if (!res.ok) {
      throw new Error(`College search failed: ${res.status}`)
    }

    const data = await res.json()
    total = data.total || 0

    const hits = (data.hits || []) as Array<{
      source?: Record<string, unknown>
      id?: string
    }>

    hits.forEach(h => {
      const source = h.source || {}
      const school = source.school as Record<string, unknown> | undefined
      const conference = school?.conference as
        | Record<string, unknown>
        | undefined
      const division = conference?.division as
        | Record<string, unknown>
        | undefined

      const embeddedRoster = parseEmbeddedRoster(school?.roster)

      allClubs.push({
        clubId: String(source.id || h.id || ''),
        name: String(source.name || ''),
        gender: String(source.gender || ''),
        divisionName: String(
          division?.divisionName || source.divisionName || '',
        ),
        conferenceName: String(
          conference?.conferenceName || source.conferenceName || '',
        ),
        embeddedRoster,
      })
    })

    skip += pageSize
    pages++
    await new Promise(r => setTimeout(r, delayMs))
  }

  return allClubs.filter(c => c.clubId)
}

/** Full roster for one college program (`GET /v1/club/:clubId/school`). */
export async function getCollegeSchoolRoster(
  clubId: string,
): Promise<CollegeSchoolRoster | null> {
  try {
    const res = await fetch(`${UTR_BASE}/v1/club/${clubId}/school`, {
      headers: getHeaders(),
    })
    if (!res.ok) return null

    const data = await res.json()
    const roster = (data.roster || []) as Array<Record<string, unknown>>

    const players: CollegeRosterPlayer[] = roster
      .map(p => ({
        singlesUtr: Number(p.singlesUtr) || 0,
        nationality: p.nationality ? String(p.nationality) : null,
      }))
      .filter(p => p.singlesUtr > 0 && p.singlesUtr < 17)

    if (players.length === 0) return null

    return {
      rosterYear: data.rosterYear ? String(data.rosterYear) : null,
      players,
    }
  } catch {
    return null
  }
}

/**
 * College team roster with player IDs and metadata for M4.5 persistence.
 */
export async function getCollegeRoster(
  schoolUtrId: string,
): Promise<UtrCollegeRoster> {
  const res = await fetch(`${UTR_BASE}/v1/club/${schoolUtrId}/school`, {
    headers: getHeaders(),
  })
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200)
    throw new Error(
      `UTR college roster failed: ${res.status}${detail ? ` — ${detail}` : ''}`,
    )
  }

  const data = (await res.json()) as Record<string, unknown>
  const school = data.school as Record<string, unknown> | undefined
  const conference = school?.conference as Record<string, unknown> | undefined
  const division = conference?.division as Record<string, unknown> | undefined

  const divisionName = String(
    division?.divisionName || data.divisionName || '',
  )
  const conferenceName = String(
    conference?.conferenceName || data.conferenceName || '',
  )

  const roster = (data.roster || []) as Array<Record<string, unknown>>
  const rosterPlayers = roster
    .map(parseRosterPlayer)
    .filter((p): p is NonNullable<typeof p> => p != null)
    .sort((a, b) => b.utr - a.utr)

  if (rosterPlayers.length === 0) {
    throw new Error(`No roster players found for UTR club ${schoolUtrId}`)
  }

  await new Promise(r => setTimeout(r, 200))

  return {
    schoolUtrId,
    schoolName: String(data.name || school?.name || ''),
    division: normalizeUtrDivisionLabel(divisionName, conferenceName),
    conference: conferenceName || null,
    rosterPlayers,
    asOf: new Date().toISOString().slice(0, 10),
  }
}

/** Search college tennis programs by name (men's singles teams). */
export async function searchCollegeTeams(
  query: string,
): Promise<CollegeTeamSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  const res = await fetch(
    `${UTR_BASE}/v2/search/colleges` +
      `?query=${encodeURIComponent(q)}` +
      `&top=25&skip=0` +
      `&utrType=verified` +
      `&utrTeamType=singles` +
      `&schoolClubSearch=true` +
      `&sort=name%3Aasc` +
      `&searchOrigin=searchPage`,
    { headers: getHeaders() },
  )

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200)
    throw new Error(
      `UTR college search failed: ${res.status}${detail ? ` — ${detail}` : ''}`,
    )
  }

  const data = await res.json()
  const hits = (data.hits || []) as Array<{
    source?: Record<string, unknown>
    id?: string
  }>

  const results: CollegeTeamSearchHit[] = []

  hits.forEach(h => {
    const source = h.source || {}
    const school = source.school as Record<string, unknown> | undefined
    const conference = school?.conference as Record<string, unknown> | undefined
    const division = conference?.division as Record<string, unknown> | undefined
    const divisionName = String(
      division?.divisionName || source.divisionName || '',
    )
    const conferenceName = String(
      conference?.conferenceName || source.conferenceName || '',
    )
    const mapped = normalizeUtrDivisionLabel(divisionName, conferenceName)
    if (!mapped) return

    const gender = String(source.gender || '').toLowerCase()
    if (
      gender &&
      gender !== 'male' &&
      gender !== 'm' &&
      !gender.includes('men')
    ) {
      return
    }

    results.push({
      schoolUtrId: String(source.id || h.id || ''),
      name: String(source.name || ''),
      division: mapped,
    })
  })

  return results.filter(r => r.schoolUtrId && r.name)
}

export type SchoolBenchmarks = {
  avgUtr: number
  minUtr: number
  maxUtr: number
  power6Avg: number | null
  rosterSize: number
  internationalPct: number
  rosterYear: string | null
  hasProPlayers: boolean
}

/** Aggregated roster stats (same shape as recruiting college sync). */
export async function getCollegeSchoolBenchmarks(
  clubId: string,
): Promise<SchoolBenchmarks | null> {
  const roster = await getCollegeSchoolRoster(clubId)
  if (!roster) return null

  const utrs = roster.players
    .map(p => p.singlesUtr)
    .sort((a, b) => b - a)

  const avgUtr =
    Math.round(
      (utrs.reduce((s, u) => s + u, 0) / utrs.length) * 100,
    ) / 100

  const top6 = utrs.slice(0, 6)
  const power6Avg =
    top6.length >= 3
      ? Math.round(
          (top6.reduce((s, u) => s + u, 0) / top6.length) * 100,
        ) / 100
      : null

  const intlCount = roster.players.filter(
    p => p.nationality && p.nationality !== 'USA' && p.nationality !== 'US',
  ).length

  return {
    avgUtr,
    minUtr: utrs[utrs.length - 1] ?? 0,
    maxUtr: utrs[0] ?? 0,
    power6Avg,
    rosterSize: utrs.length,
    internationalPct:
      roster.players.length > 0
        ? Math.round((intlCount / roster.players.length) * 100)
        : 0,
    rosterYear: roster.rosterYear,
    hasProPlayers: false,
  }
}

const POWER_CONFERENCE_PATTERNS = [
  'acc',
  'atlantic coast',
  'big ten',
  'big 12',
  'big twelve',
  'sec',
  'southeastern',
  'pac-12',
  'pac 12',
  'pac-10',
]

export function isPowerConference(conferenceName: string): boolean {
  const c = conferenceName.toLowerCase()
  return POWER_CONFERENCE_PATTERNS.some(p => c.includes(p))
}

/** Map UTR division label → journey_benchmarks division key. */
export function mapCollegeToJourneyDivision(
  divisionName: string,
  conferenceName: string,
): string | null {
  const div = divisionName.toLowerCase()

  // Order matters: "division iii" contains "division i" as a substring.
  if (/\bdivision\s*iii\b/.test(div) || /\bdiii\b/.test(div) || div === 'd3') {
    return 'd3'
  }
  if (/\bdivision\s*ii\b/.test(div) || /\bdii\b/.test(div) || div === 'd2') {
    return 'd2'
  }
  if (
    /\bdivision\s*i\b/.test(div) ||
    /\bdivision\s*1\b/.test(div) ||
    div === 'd1' ||
    /\bd1\b/.test(div)
  ) {
    return isPowerConference(conferenceName) ? 'd1_power' : 'd1_mid_major'
  }
  if (div.includes('naia')) return 'naia'
  if (
    div.includes('juco') ||
    div.includes('junior') ||
    div.includes('njcaa') ||
    div.includes('community college') ||
    div.includes('california cc')
  ) {
    return 'juco'
  }

  return null
}
