import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('schools')
    .select(
      `
      ipeds_id, name, state,
      sat_25th, sat_75th,
      school_tennis_programs!inner (
        division, roster_avg_utr, roster_min_utr, roster_max_utr, roster_starter_avg_utr
      )
    `,
    )
    .eq('has_tennis_program', true)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ schools: data ?? [] })
}
