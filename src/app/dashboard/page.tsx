'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import UniversalVia from '@/components/UniversalVia'
import { GlassCard } from '@/components/GlassCard'
import { typography } from '@/lib/brand'
import { glass } from '@/lib/glass'

const TEAL = '#1D9E75'
const TEXT = glass.light.text.primary
const TEXT_MUTED = glass.light.text.muted
const DIVIDER = '0.5px solid rgba(255,255,255,.45)'

type DashboardLesson = {
  id: string
  starts_at: string
  players?: { name?: string | null; sport?: string | null } | null
}

type UnverifiedSession = {
  id: string
  player_id: string
  overall_score?: number | null
  top_issue?: string | null
  analyzed_at: string
  players?: { name?: string | null } | null
}

const rowStyle = {
  ...glass.light.row,
  padding: '10px 12px',
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 10,
  cursor: 'pointer' as const,
}

export default function DashboardHome() {
  const router = useRouter()
  const supabase = createClient()
  const [coachName, setCoachName] = useState('')
  const [greeting, setGreeting] = useState('Good morning')
  const [lessons, setLessons] = useState<DashboardLesson[]>([])
  const [unverified, setUnverified] = useState<UnverifiedSession[]>([])
  const [, setRecentSessions] = useState<unknown[]>([])

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, first_name')
        .eq('id', user.id)
        .single()

      const name =
        profile?.first_name ||
        profile?.full_name?.split(' ')[0] ||
        'Coach'
      setCoachName(name)

      const hour = new Date().getHours()
      if (hour < 12) setGreeting('Good morning')
      else if (hour < 17) setGreeting('Good afternoon')
      else setGreeting('Good evening')
    }
    load()
  }, [supabase])

  useEffect(() => {
    async function loadDashboardData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const weekStart = new Date()
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() + 7)

      const [{ data: lessonsData }, { data: unverifiedData }, { data: recentSessionsData }] =
        await Promise.all([
          supabase
            .from('lessons')
            .select('*, players(name, sport)')
            .gte('starts_at', weekStart.toISOString())
            .lte('starts_at', weekEnd.toISOString())
            .order('starts_at', { ascending: true })
            .limit(8),
          supabase
            .from('analysis_sessions')
            .select('*, players(name)')
            .eq('coach_verified', false)
            .order('analyzed_at', { ascending: false })
            .limit(5),
          supabase
            .from('analysis_sessions')
            .select('player_id, overall_score, analyzed_at, players(name, id)')
            .order('analyzed_at', { ascending: false })
            .limit(40),
        ])

      setLessons((lessonsData || []) as DashboardLesson[])
      setUnverified((unverifiedData || []) as UnverifiedSession[])
      setRecentSessions((recentSessionsData || []) as unknown[])
    }
    void loadDashboardData()
  }, [supabase])

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '0 0 40px',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            ...typography.greeting,
            color: TEXT,
            marginBottom: 4,
          }}
        >
          {greeting}
          {coachName ? `, ${coachName}` : ''}
        </h1>
      </div>

      <UniversalVia
        role="coach"
        pageContext={{ page: 'dashboard-home' }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
          marginTop: 4,
        }}
      >
        <GlassCard mode="light" style={{ padding: 0 }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: DIVIDER,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>This week</span>
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>{lessons.length} lessons</span>
          </div>
          {lessons.length === 0 ? (
            <div style={{ padding: '20px 16px', fontSize: 12, color: TEXT_MUTED, textAlign: 'center' }}>
              No lessons scheduled this week
            </div>
          ) : (
            <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lessons.slice(0, 5).map(lesson => (
                <div
                  key={lesson.id}
                  onClick={() => router.push(`/dashboard/lessons/${lesson.id}`)}
                  style={rowStyle}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      ...glass.light.scoreBadge,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, lineHeight: 1 }}>
                      {new Date(lesson.starts_at).getDate()}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: TEXT_MUTED,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                      }}
                    >
                      {new Date(lesson.starts_at).toLocaleString('en', { weekday: 'short' })}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: TEXT,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lesson.players?.name || 'Player'}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                      {new Date(lesson.starts_at).toLocaleTimeString('en', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {lesson.players?.sport
                        ? ` · ${lesson.players.sport.charAt(0).toUpperCase()}${lesson.players.sport.slice(1)}`
                        : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {lessons.length > 5 && (
            <div
              style={{
                padding: '9px 16px',
                borderTop: DIVIDER,
                fontSize: 11,
                color: TEAL,
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => router.push('/dashboard/schedule')}
            >
              +{lessons.length - 5} more this week →
            </div>
          )}
        </GlassCard>

        <GlassCard mode="light" style={{ padding: 0 }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: DIVIDER,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>Reels to verify</span>
            {unverified.length > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#FAEEDA',
                  border: '0.5px solid #EF9F27',
                  fontSize: 10,
                  color: '#633806',
                  fontWeight: 500,
                }}
              >
                {unverified.length} pending
              </span>
            )}
          </div>
          {unverified.length === 0 ? (
            <div style={{ padding: '20px 16px', fontSize: 12, color: TEXT_MUTED, textAlign: 'center' }}>
              All reels verified
            </div>
          ) : (
            <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unverified.slice(0, 5).map(session => (
                <div
                  key={session.id}
                  onClick={() => router.push(`/dashboard/players/${session.player_id}`)}
                  style={rowStyle}
                >
                  <div
                    style={{
                      width: 44,
                      height: 36,
                      borderRadius: 7,
                      background: '#0d1a14',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 3,
                        left: 4,
                        fontSize: 9,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,.7)',
                        ...glass.light.scoreBadge,
                        padding: '0 3px',
                        borderRadius: 3,
                      }}
                    >
                      {session.overall_score}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: TEXT,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {session.players?.name || 'Player'}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                      {session.top_issue || 'No issue'} ·{' '}
                      {new Date(session.analyzed_at).toLocaleDateString('en', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 9px',
                      borderRadius: 7,
                      ...glass.light.scoreBadge,
                      fontSize: 10,
                      color: TEXT_MUTED,
                      flexShrink: 0,
                    }}
                  >
                    Verify
                  </div>
                </div>
              ))}
            </div>
          )}
          {unverified.length > 5 && (
            <div
              style={{
                padding: '9px 16px',
                borderTop: DIVIDER,
                fontSize: 11,
                color: TEAL,
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => router.push('/dashboard/players')}
            >
              +{unverified.length - 5} more →
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
