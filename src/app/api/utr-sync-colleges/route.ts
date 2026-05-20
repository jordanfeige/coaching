import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 120

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

function isCronAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(key && auth === `Bearer ${key}`)
}

type CollegeClub = {
  clubId: string
  name: string
  gender: string
  divisionName: string
  conferenceName: string
}

async function fetchAllCollegeIds(): Promise<CollegeClub[]> {
  const allClubs: CollegeClub[] = []
  const pageSize = 100
  let skip = 0
  let total = Infinity

  while (skip < total) {
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

    const hits = data.hits || []
    hits.forEach((h: { source?: Record<string, unknown>; id?: string }) => {
      const source = h.source || {}
      allClubs.push({
        clubId: String(source.id || h.id || ''),
        name: String(source.name || ''),
        gender: String(source.gender || ''),
        divisionName: String(source.divisionName || ''),
        conferenceName: String(source.conferenceName || ''),
      })
    })

    skip += pageSize
    await new Promise(r => setTimeout(r, 200))

    if (skip >= 500) break
  }

  return allClubs.filter(c => c.clubId)
}

type SchoolBenchmarks = {
  avgUtr: number | null
  minUtr: number | null
  maxUtr: number | null
  power6Avg: number | null
  rosterSize: number
  internationalPct: number
  rosterYear: string | null
  hasProPlayers: boolean
}

async function fetchSchoolBenchmarks(
  clubId: string,
): Promise<SchoolBenchmarks | null> {
  try {
    const res = await fetch(`${UTR_BASE}/v1/club/${clubId}/school`, {
      headers: getHeaders(),
    })

    if (!res.ok) return null

    const data = await res.json()
    const roster: Array<Record<string, unknown>> = data.roster || []

    if (roster.length === 0) return null

    const utrs = roster
      .map(p => p.singlesUtr as number)
      .filter(u => u && u > 0 && u < 17)
      .sort((a, b) => b - a)

    if (utrs.length === 0) return null

    const avgUtr =
      Math.round(
        (utrs.reduce((s, u) => s + u, 0) / utrs.length) * 100,
      ) / 100

    const minUtr = utrs[utrs.length - 1] || null
    const maxUtr = utrs[0] || null

    const top6 = utrs.slice(0, 6)
    const power6Avg =
      top6.length >= 3
        ? Math.round(
            (top6.reduce((s, u) => s + u, 0) / top6.length) * 100,
          ) / 100
        : null

    const intlCount = roster.filter(
      p =>
        p.nationality &&
        p.nationality !== 'USA' &&
        p.nationality !== 'US',
    ).length
    const internationalPct =
      roster.length > 0
        ? Math.round((intlCount / roster.length) * 100)
        : 0

    const hasProPlayers = roster.some(p => {
      const rankings = p.thirdPartyRankings as
        | Array<{ source?: string }>
        | undefined
      return rankings?.some(
        r => r.source === 'ATP' || r.source === 'WTA',
      )
    })

    return {
      avgUtr,
      minUtr,
      maxUtr,
      power6Avg,
      rosterSize: roster.length,
      internationalPct,
      rosterYear: data.rosterYear || null,
      hasProPlayers,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  if (isCronAuthorized(req)) {
    const admin = createSupabaseAdminClient()
    after(async () => {
      await syncAllColleges(admin)
    })

    return NextResponse.json({
      success: true,
      message:
        'Sync started. Check back in ~10 minutes for results.',
    })
  }

  const supabase = createSupabaseAdminClient()

  const { count } = await supabase
    .from('college_tennis_benchmarks')
    .select('*', { count: 'exact', head: true })

  const { data: latest } = await supabase
    .from('college_tennis_benchmarks')
    .select('last_synced_at')
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    totalSchools: count || 0,
    lastSynced: latest?.last_synced_at || null,
  })
}

export async function POST(req: NextRequest) {
  const cronOk = isCronAuthorized(req)
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !cronOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const body = await req.json()
  const { action, clubId } = body as {
    action?: string
    clubId?: string
  }

  if (action === 'sync_one' && clubId) {
    const benchmarks = await fetchSchoolBenchmarks(clubId)

    if (!benchmarks) {
      return NextResponse.json({
        success: false,
        error: 'No roster data found',
      })
    }

    await admin.from('college_tennis_benchmarks').upsert(
      {
        club_id: clubId,
        avg_utr: benchmarks.avgUtr,
        min_utr: benchmarks.minUtr,
        max_utr: benchmarks.maxUtr,
        power6_avg: benchmarks.power6Avg,
        roster_size: benchmarks.rosterSize,
        international_pct: benchmarks.internationalPct,
        roster_year: benchmarks.rosterYear,
        has_pro_players: benchmarks.hasProPlayers,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'club_id' },
    )

    return NextResponse.json({
      success: true,
      clubId,
      benchmarks,
    })
  }

  if (action === 'sync_all') {
    after(async () => {
      await syncAllColleges(admin)
    })

    return NextResponse.json({
      success: true,
      message:
        'Sync started. Check back in ~10 minutes for results.',
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

async function syncAllColleges(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
) {
  try {
    console.log('UTR college sync starting...')

    const clubs = await fetchAllCollegeIds()
    console.log(`Found ${clubs.length} college programs`)

    let synced = 0
    let failed = 0

    for (const club of clubs) {
      try {
        const benchmarks = await fetchSchoolBenchmarks(club.clubId)

        if (benchmarks) {
          await supabase.from('college_tennis_benchmarks').upsert(
            {
              club_id: club.clubId,
              school_name: club.name
                .replace(' - M', '')
                .replace(' - W', '')
                .trim(),
              display_name: club.name,
              gender: club.gender === 'Female' ? 'F' : 'M',
              division: club.divisionName,
              conference: club.conferenceName,
              avg_utr: benchmarks.avgUtr,
              min_utr: benchmarks.minUtr,
              max_utr: benchmarks.maxUtr,
              power6_avg: benchmarks.power6Avg,
              roster_size: benchmarks.rosterSize,
              international_pct: benchmarks.internationalPct,
              roster_year: benchmarks.rosterYear,
              has_pro_players: benchmarks.hasProPlayers,
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: 'club_id' },
          )

          synced++
        } else {
          failed++
        }

        await new Promise(r => setTimeout(r, 200))
      } catch (e: unknown) {
        console.error(
          `Failed ${club.name}:`,
          e instanceof Error ? e.message : e,
        )
        failed++
      }
    }

    console.log(`UTR sync complete: ${synced} synced, ${failed} failed`)
  } catch (e: unknown) {
    console.error(
      'UTR sync error:',
      e instanceof Error ? e.message : e,
    )
  }
}
