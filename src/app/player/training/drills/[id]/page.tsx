import { redirect } from 'next/navigation'
import { DrillLibraryDetailClient } from '@/components/player/training/DrillLibraryDetailClient'
import { portalPageWrapStyle } from '@/lib/player-portal-styles'
import type { LibraryDrillRow } from '@/lib/drills-library'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function DrillLibraryDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) redirect('/onboarding')

  const { data: drill } = await supabase
    .from('drills_library')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!drill) redirect('/player/training/drills')

  return (
    <div style={{ ...portalPageWrapStyle, padding: '14px 16px 40px' }}>
      <DrillLibraryDetailClient drill={drill as LibraryDrillRow} />
    </div>
  )
}
