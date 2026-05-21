import { createServerSupabaseClient } from '@/lib/supabase-server'
import { shouldShowRecruitingBanner, type PrimaryGoal } from '@/lib/journey-routing'
import JourneyRecruitingBanner from '@/components/journey/JourneyRecruitingBanner'
import PlayerHomeClient from '@/components/player/PlayerHomeClient'

export default async function PlayerHome() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let banner: { playerId: string; goal: PrimaryGoal } | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('player_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.player_id) {
      const playerId = profile.player_id
      const { data: prefs } = await supabase
        .from('journey_preferences')
        .select(
          'primary_goal, not_recruiting, recruiting_banner_dismissed, wizard_completed_at',
        )
        .eq('player_id', playerId)
        .maybeSingle()

      if (
        shouldShowRecruitingBanner({
          goal: (prefs?.primary_goal as PrimaryGoal) ?? null,
          notRecruiting: prefs?.not_recruiting ?? false,
          bannerDismissed: prefs?.recruiting_banner_dismissed ?? false,
          wizardCompletedAt: prefs?.wizard_completed_at ?? null,
        })
      ) {
        banner = {
          playerId,
          goal: (prefs?.primary_goal as PrimaryGoal) ?? null,
        }
      }
    }
  }

  return (
    <>
      {banner && (
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto 20px',
            padding: '0 16px',
          }}
        >
          <JourneyRecruitingBanner playerId={banner.playerId} goal={banner.goal} />
        </div>
      )}
      <PlayerHomeClient />
    </>
  )
}
