import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeAcademicBenchmarksFromSchools } from '@/lib/compute-academic-benchmarks'
import { syncCollegeScorecard } from '@/lib/sync-college-scorecard'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'COLLEGE_SCORECARD_API_KEY not configured' },
      { status: 500 },
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  try {
    const scorecard = await syncCollegeScorecard(supabase, apiKey, {
      log: msg => console.log(msg),
    })
    const benchmarks = await computeAcademicBenchmarksFromSchools(supabase, {
      log: msg => console.log(msg),
    })

    return NextResponse.json({
      ok: true,
      scorecard,
      benchmarks,
    })
  } catch (e) {
    console.error('Scorecard sync failed:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
