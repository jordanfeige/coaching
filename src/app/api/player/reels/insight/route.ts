import { NextResponse } from 'next/server'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import {
  drillNameFromEntry,
  issueNameFromEntry,
  type ReelInsightRow,
} from '@/lib/reel-insights'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return NextResponse.json({ error: 'No player' }, { status: 404 })
  }

  const { data: recent } = await supabase
    .from('analysis_sessions')
    .select('id, analyzed_at, shot_type, full_result')
    .eq('player_id', playerId)
    .or(PLAYER_VISIBLE_SESSIONS_FILTER)
    .order('analyzed_at', { ascending: false })
    .limit(8)

  const reels = (recent ?? []) as ReelInsightRow[]

  if (reels.length < 2) {
    return NextResponse.json({
      hasInsight: false,
      message: 'Log a few more reels to see pattern-based coaching insights.',
    })
  }

  const issueDetail: Record<
    string,
    { count: number; suggestedDrill?: string; shotTypes: Set<string> }
  > = {}

  for (const reel of reels) {
    const areas = reel.full_result?.areas_to_improve
    if (!Array.isArray(areas)) continue
    for (const entry of areas) {
      const name = issueNameFromEntry(entry)
      if (!name) continue
      if (!issueDetail[name]) {
        issueDetail[name] = { count: 0, shotTypes: new Set() }
      }
      issueDetail[name].count += 1
      const drill = drillNameFromEntry(entry)
      if (drill && !issueDetail[name].suggestedDrill) {
        issueDetail[name].suggestedDrill = drill
      }
      if (reel.shot_type) {
        issueDetail[name].shotTypes.add(reel.shot_type)
      }
    }
  }

  let topIssueName: string | null = null
  let topIssueData: (typeof issueDetail)[string] | null = null
  for (const [name, data] of Object.entries(issueDetail)) {
    if (data.count >= 2 && (!topIssueData || data.count > topIssueData.count)) {
      topIssueName = name
      topIssueData = data
    }
  }

  if (!topIssueName || !topIssueData) {
    return NextResponse.json({
      hasInsight: false,
      message:
        'No recurring patterns yet — your technique work is varied across reels.',
    })
  }

  const shotTypes = Array.from(topIssueData.shotTypes)
  const shotTypeLabel =
    shotTypes.length === 1 ? shotTypes[0] : 'multiple shot types'

  const drillSuffix = topIssueData.suggestedDrill
    ? ` Try the ${topIssueData.suggestedDrill} this week.`
    : ' Focus drills on this in your next session.'

  return NextResponse.json({
    hasInsight: true,
    title: `From your last ${reels.length} reels`,
    headline: topIssueName,
    body: `Your ${topIssueName.toLowerCase()} appeared in ${topIssueData.count} of your last ${reels.length} ${shotTypeLabel} reels. This is your most persistent issue.${drillSuffix}`,
    suggestedDrill: topIssueData.suggestedDrill ?? null,
  })
}
