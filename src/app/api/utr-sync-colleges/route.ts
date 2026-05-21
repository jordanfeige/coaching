import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  getCollegeSchoolBenchmarks,
  listAllCollegeTeams,
} from '@/lib/utr-colleges'

export const maxDuration = 120

function isCronAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(key && auth === `Bearer ${key}`)
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
    const benchmarks = await getCollegeSchoolBenchmarks(clubId)

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

    const clubs = await listAllCollegeTeams()
    console.log(`Found ${clubs.length} college programs`)

    let synced = 0
    let failed = 0

    for (const club of clubs) {
      try {
        const benchmarks = await getCollegeSchoolBenchmarks(club.clubId)

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
