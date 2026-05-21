import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import { fetchJourneyPageData } from '@/lib/journey-fetch'
import { fetchJourneyPageSupplement } from '@/lib/journey-page-supplement'
import { buildJourneyViewModel } from '@/lib/journey-view-model'
import JourneyPageClient from '@/components/journey/JourneyPageClient'

export default async function JourneyPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        No player profile found. Contact support.
      </div>
    )
  }

  const [raw, supplement] = await Promise.all([
    fetchJourneyPageData(supabase, playerId),
    fetchJourneyPageSupplement(supabase, playerId),
  ])

  if (!raw) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        Could not load Journey data.
      </div>
    )
  }

  const data = {
    ...buildJourneyViewModel(raw),
    roadToOffer: supplement.roadToOffer,
    nudgeContext: supplement.nudgeContext,
  }
  return <JourneyPageClient data={data} />
}
