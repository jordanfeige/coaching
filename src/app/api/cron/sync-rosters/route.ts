import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncCollegeRostersToBenchmarks } from '@/lib/sync-college-rosters'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.UTR_JWT) {
    return NextResponse.json({ error: 'UTR_JWT not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  try {
    const result = await syncCollegeRostersToBenchmarks(supabase, {
      log: msg => console.log(msg),
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('Roster sync failed:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Roster sync failed' },
      { status: 500 },
    )
  }
}
