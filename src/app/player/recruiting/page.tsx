import { redirect } from 'next/navigation'
import { RecruitingOverview } from '@/components/player/recruiting/RecruitingOverview'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import { loadRecruitingOverview } from '@/lib/recruiting-overview-load'

export const dynamic = 'force-dynamic'

export default async function RecruitingOverviewPage() {
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
      <h1
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 24,
          fontWeight: 500,
          margin: '0 0 16px',
        }}
      >
        Recruiting
      </h1>
      <RecruitingOverview data={overview} />
    </div>
  )
}
