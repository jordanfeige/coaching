'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  RECRUITING_BANNER_HEADLINES,
  type PrimaryGoal,
} from '@/lib/journey-routing'

type Props = {
  playerId: string
  goal: PrimaryGoal
}

export default function JourneyRecruitingBanner({ playerId, goal }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const headline =
    (goal && RECRUITING_BANNER_HEADLINES[goal]) ||
    RECRUITING_BANNER_HEADLINES.not_sure_yet

  async function dismissNotRecruiting() {
    await supabase.from('journey_preferences').upsert({
      player_id: playerId,
      recruiting_banner_dismissed: true,
      not_recruiting: true,
      updated_at: new Date().toISOString(),
    })
    router.refresh()
  }

  return (
    <div
      style={{
        borderRadius: 18,
        padding: '18px 20px',
        background: 'linear-gradient(135deg, #063D31 0%, #0F6E56 55%, #1a8a6a 100%)',
        boxShadow: '0 10px 32px rgba(6,61,49,0.22)',
        color: 'white',
      }}
    >
      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1.35,
          marginBottom: 14,
        }}
      >
        {headline}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Link
          href="/onboarding/journey/class-year"
          style={{
            padding: '10px 18px',
            background: 'white',
            color: '#0F6E56',
            borderRadius: 10,
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Build my Journey profile →
        </Link>
        <button
          type="button"
          onClick={dismissNotRecruiting}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 10,
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Not recruiting — hide this
        </button>
      </div>
    </div>
  )
}
