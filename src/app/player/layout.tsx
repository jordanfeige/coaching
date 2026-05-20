import PlayerLayoutClient from './PlayerLayoutClient'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayersForUser } from '@/lib/linked-player'

type PlayerForChat = {
  id: string
  name: string
  sport: string
  skillLevel?: string
}

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let player: PlayerForChat | null = null
  let showRecruitingNav = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('player_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.player_id) {
      const { data: playerRow } = await supabase
        .from('players')
        .select('id, name, sport, skill_level')
        .eq('id', profile.player_id)
        .maybeSingle()

      if (playerRow?.id) {
        player = {
          id: playerRow.id,
          name: playerRow.name || 'Athlete',
          sport: playerRow.sport || 'tennis',
          skillLevel: playerRow.skill_level || undefined,
        }
      }
    }

    if (!player) {
      const linkedPlayers = await getLinkedPlayersForUser(supabase, user.id)
      const linked = linkedPlayers[0]
      if (linked) {
        player = {
          id: linked.id,
          name: linked.name || 'Athlete',
          sport: linked.sport || 'tennis',
          skillLevel: linked.skill_level || undefined,
        }
      }
    }
  }

  if (player) {
    const sport = (player.sport || 'tennis').toLowerCase()
    showRecruitingNav =
      sport === 'tennis' ||
      sport === 'pickleball' ||
      sport === 'baseball'
  }

  return (
    <PlayerLayoutClient player={player} showRecruitingNav={showRecruitingNav}>
      {children}
    </PlayerLayoutClient>
  )
}
