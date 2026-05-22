import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DrillLibraryClient } from '@/components/player/training/DrillLibraryClient'
import {
  portalPageTitleStyle,
  portalPageWrapStyle,
} from '@/lib/player-portal-styles'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

export const dynamic = 'force-dynamic'

export default async function DrillLibraryPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) redirect('/onboarding')

  const { data: drills } = await supabase
    .from('drills_library')
    .select(
      'id, name, primary_category, drill_type, skill_level, duration_minutes, mode, requires, description, source, created_by_player_id, created_by_coach_id',
    )
    .order('name', { ascending: true })

  return (
    <div style={{ ...portalPageWrapStyle, padding: '14px 16px 40px' }}>
      <Link
        href="/player/training"
        style={{
          display: 'inline-block',
          fontSize: 12,
          color: '#0F6E56',
          fontWeight: 500,
          textDecoration: 'none',
          marginBottom: 12,
        }}
      >
        ← Training
      </Link>

      <h1 style={{ ...portalPageTitleStyle, marginBottom: 14 }}>Drill library</h1>

      <DrillLibraryClient drills={drills ?? []} playerId={playerId} />
    </div>
  )
}
