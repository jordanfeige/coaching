import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function isMissingHistoryTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error?.code === '42P01' ||
    error?.message?.includes('consumer_analysis_history') ||
    error?.message?.includes('schema cache')
  )
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('consumer_analysis_history')
    .select('id, sport, shot_type, camera_angle, result, created_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    if (isMissingHistoryTable(error)) {
      return NextResponse.json({ analyses: [], warning: 'Analysis history table is not available yet.' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ analyses: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { sport, shotType, cameraAngle, result } = await req.json()
    const { error } = await supabase.from('consumer_analysis_history').insert({
      profile_id: user.id,
      sport,
      shot_type: shotType || null,
      camera_angle: cameraAngle || null,
      result,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save analysis' },
      { status: 500 }
    )
  }
}
