import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
