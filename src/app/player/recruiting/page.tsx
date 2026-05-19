'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import RecruitingProfile from '@/components/RecruitingProfile'

export default function PlayerRecruitingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [player, setPlayer] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [gradYear, setGradYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('player_id')
        .eq('id', user.id)
        .maybeSingle()

      if (prof?.player_id) {
        const { data: p } = await supabase
          .from('players')
          .select('*')
          .eq('id', prof.player_id)
          .maybeSingle()
        setPlayer(p)

        const { data: recruiting } = await supabase
          .from('recruiting_profiles')
          .select('grad_year')
          .eq('player_id', prof.player_id)
          .maybeSingle()
        if (recruiting?.grad_year) setGradYear(recruiting.grad_year)

        const { data: s } = await supabase
          .from('analysis_sessions')
          .select('*')
          .eq('player_id', prof.player_id)
          .order('analyzed_at', { ascending: true })
        setSessions(s || [])
      }

      setLoading(false)
    }
    load()
  }, [router, supabase])

  if (loading || !player) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          fontFamily: 'Arial, sans-serif',
          color: 'hsl(220,10%,65%)',
          fontSize: 14,
        }}
      >
        Loading recruiting profile...
      </div>
    )
  }

  const classLabel = gradYear
    ? `Class of ${gradYear}`
    : `Class of ${new Date().getFullYear() + 3}`

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ marginBottom: 20, fontFamily: 'Arial, sans-serif' }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'hsl(220,20%,15%)',
            letterSpacing: '-.5px',
            marginBottom: 4,
          }}
        >
          Recruiting
        </h1>
        <p style={{ fontSize: 12, color: 'hsl(220,10%,65%)' }}>
          {player.name} · {classLabel}
        </p>
      </div>

      <RecruitingProfile
        playerId={player.id}
        playerName={player.name}
        sport={player.sport}
        isCoach={false}
        analysisSessions={sessions}
      />
    </div>
  )
}
