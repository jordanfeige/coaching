import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type AnalysisIssue = {
  area?: string
  severity?: string
}

type AnalysisResult = {
  overall_rating?: string
  areas_to_improve?: AnalysisIssue[]
}

function topIssue(result: AnalysisResult) {
  const issues = Array.isArray(result.areas_to_improve) ? result.areas_to_improve : []
  return (
    issues.find(issue => issue.severity === 'critical')?.area ||
    issues[0]?.area ||
    'Technique improvement'
  )
}

export async function POST(req: NextRequest) {
  try {
    const { sport = 'tennis', shotType = null, name = null, result } = await req.json()

    if (!result || typeof result !== 'object') {
      return NextResponse.json({ error: 'Analysis result is required' }, { status: 400 })
    }

    const analysis = result as AnalysisResult
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('analyses')
      .insert({
        sport: String(sport || 'tennis').toLowerCase(),
        shot_type: shotType ? String(shotType) : null,
        athlete_name: name ? String(name) : null,
        rating: analysis.overall_rating || null,
        top_issue: topIssue(analysis),
        result,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save analysis' },
      { status: 500 }
    )
  }
}
