import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 120

const SCORECARD_KEY = process.env.COLLEGE_SCORECARD_API_KEY

function isCronAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  return Boolean(secret && auth === `Bearer ${secret}`)
}

async function runEnrich() {
  if (!SCORECARD_KEY) {
    return NextResponse.json(
      { error: 'COLLEGE_SCORECARD_API_KEY not configured' },
      { status: 503 },
    )
  }

  const supabase = createSupabaseAdminClient()

  const { data: schools } = await supabase
    .from('college_tennis_benchmarks')
    .select('id, school_name, state')
    .is('scorecard_id', null)
    .limit(100)

  if (!schools?.length) {
    return NextResponse.json({
      message: 'All schools already enriched',
    })
  }

  let enriched = 0

  for (const school of schools) {
    try {
      const name = school.school_name
        ?.replace(' University', '')
        ?.replace(' College', '')
        ?.trim()

      const res = await fetch(
        `https://api.data.gov/ed/collegescorecard/v1/schools` +
          `?api_key=${SCORECARD_KEY}` +
          `&school.name=${encodeURIComponent(name || '')}` +
          `&fields=id,school.name,school.state,` +
          `school.city,school.locale,` +
          `school.ownership,latest.student.size,` +
          `latest.admissions.admission_rate.overall,` +
          `latest.admissions.sat_scores.25th_percentile.cumulative,` +
          `latest.admissions.sat_scores.75th_percentile.cumulative,` +
          `latest.admissions.act_scores.25th_percentile.cumulative,` +
          `latest.admissions.act_scores.75th_percentile.cumulative,` +
          `latest.completion.completion_rate_4yr_150nt,` +
          `latest.cost.tuition.in_state,` +
          `latest.cost.tuition.out_of_state,` +
          `latest.earnings.10_yrs_after_entry.median` +
          `&per_page=1`,
      )

      const data = await res.json()
      const schoolData = data.results?.[0] as
        | Record<string, unknown>
        | undefined

      if (schoolData) {
        await supabase
          .from('college_tennis_benchmarks')
          .update({
            scorecard_id: String(schoolData.id ?? ''),
            sat_25th: schoolData[
              'latest.admissions.sat_scores.25th_percentile.cumulative'
            ] as number | null,
            sat_75th: schoolData[
              'latest.admissions.sat_scores.75th_percentile.cumulative'
            ] as number | null,
            act_25th: schoolData[
              'latest.admissions.act_scores.25th_percentile.cumulative'
            ] as number | null,
            act_75th: schoolData[
              'latest.admissions.act_scores.75th_percentile.cumulative'
            ] as number | null,
            acceptance_rate: schoolData[
              'latest.admissions.admission_rate.overall'
            ] as number | null,
            graduation_rate: schoolData[
              'latest.completion.completion_rate_4yr_150nt'
            ] as number | null,
            tuition_in_state: schoolData[
              'latest.cost.tuition.in_state'
            ] as number | null,
            tuition_out_of_state: schoolData[
              'latest.cost.tuition.out_of_state'
            ] as number | null,
            median_earnings_10yr: schoolData[
              'latest.earnings.10_yrs_after_entry.median'
            ] as number | null,
            student_size: schoolData['latest.student.size'] as
              | number
              | null,
            school_type:
              schoolData['school.ownership'] === 1
                ? 'public'
                : 'private',
            state: schoolData['school.state'] as string | null,
            city: schoolData['school.city'] as string | null,
            locale: schoolData['school.locale'] as string | null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', school.id)

        enriched++
      }

      await new Promise(r => setTimeout(r, 100))
    } catch (e: unknown) {
      console.error(
        `Scorecard enrich failed ${school.school_name}:`,
        e instanceof Error ? e.message : e,
      )
    }
  }

  return NextResponse.json({
    success: true,
    enriched,
    remaining: schools.length - enriched,
  })
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runEnrich()
}

export async function POST(req: NextRequest) {
  const cronOk = isCronAuthorized(req)
  if (!cronOk) {
    const supabaseAuth = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return runEnrich()
}
