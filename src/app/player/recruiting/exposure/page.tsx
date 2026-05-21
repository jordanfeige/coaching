import { redirect } from 'next/navigation'
import { ExposureRecruitingView } from '@/components/player/recruiting/ExposureRecruitingView'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import { loadRecruitingOverview } from '@/lib/recruiting-overview-load'
import { portalPageTitleStyle } from '@/lib/player-portal-styles'

export const dynamic = 'force-dynamic'

export default async function RecruitingExposurePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) redirect('/onboarding')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const overview = await loadRecruitingOverview(supabase, playerId, {
    profileFullName: profile?.full_name ?? null,
    userId: user.id,
  })

  return (
    <div>
      <h1 style={portalPageTitleStyle}>Exposure</h1>
      <ExposureRecruitingView
        score={overview.exposure.exposureScore}
        max={overview.exposure.exposureMax}
        tier={overview.journeyTier}
      />
    </div>
  )
}
