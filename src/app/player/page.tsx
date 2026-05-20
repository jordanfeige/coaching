'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import { differenceInDays, format } from 'date-fns'
import UniversalVia from '@/components/UniversalVia'
import { typography } from '@/lib/brand'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'

const CSS = `
  @keyframes pulseDot {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50%       { opacity: 1; transform: scale(1.15); }
  }
  @media (max-width: 480px) {
    .metrics-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .bottom-grid { grid-template-columns: 1fr !important; }
  }
`

const TEAL = 'hsl(168,62%,36%)'
const TEAL_DARK = 'hsl(168,62%,28%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const RED = '#DC2626'
const AMBER = '#D97706'
const PURPLE = '#7C3AED'
const GREEN = '#16A34A'

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

type PoseMeasurement = {
  label?: string
  measured?: number
  status?: 'good' | 'warning' | 'critical'
  deficit?: number
}

export default function PlayerHome() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [player, setPlayer] = useState<{
    id: string
    name: string | null
    sport: string | null
    skill_level?: string | null
  } | null>(null)
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([])
  const [drills, setDrills] = useState<Array<Record<string, unknown>>>([])
  const [lessons, setLessons] = useState<Array<Record<string, unknown>>>([])
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

      const playerData = await getLinkedPlayerRowForUser(supabase, user.id)
      if (!playerData?.id) {
        setLoading(false)
        return
      }

      setPlayer({
        id: playerData.id,
        name: playerData.name,
        sport: playerData.sport,
        skill_level: playerData.skill_level,
      })

      const playerId = playerData.id

      const { data: sessionRows } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('player_id', playerId)
        .or(PLAYER_VISIBLE_SESSIONS_FILTER)
        .order('analyzed_at', { ascending: true })

      setSessions(sessionRows || [])

      const { data: drillRows } = await supabase
        .from('drills')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(3)

      setDrills(drillRows || [])

      const { data: lessonRows } = await supabase
        .from('lessons')
        .select('*')
        .eq('player_id', playerId)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(2)

      setLessons(lessonRows || [])
      setLoading(false)
    }
    void load()
  }, [router, supabase])

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(String(a.analyzed_at)).getTime() -
          new Date(String(b.analyzed_at)).getTime(),
      ),
    [sessions],
  )

  const latest = sortedSessions[sortedSessions.length - 1]
  const previous = sortedSessions[sortedSessions.length - 2]
  const first = sortedSessions[0]

  const currentScore =
    typeof latest?.overall_score === 'number' ? latest.overall_score : null
  const delta =
    currentScore !== null &&
    previous &&
    typeof previous.overall_score === 'number'
      ? currentScore - previous.overall_score
      : null
  const totalGain =
    latest &&
    first &&
    first.id !== latest.id &&
    typeof latest.overall_score === 'number' &&
    typeof first.overall_score === 'number'
      ? latest.overall_score - first.overall_score
      : 0

  const poseRaw = latest?.pose_measurements
  const pose: PoseMeasurement[] | null = Array.isArray(poseRaw)
    ? (poseRaw as PoseMeasurement[])
    : poseRaw &&
        typeof poseRaw === 'object' &&
        Array.isArray((poseRaw as { measurements?: PoseMeasurement[] }).measurements)
      ? (poseRaw as { measurements: PoseMeasurement[] }).measurements
      : null

  const firstName = player?.name?.split(' ')[0] || 'there'

  const nextLesson = lessons[0]
  const nextLessonDate =
    nextLesson && typeof nextLesson.starts_at === 'string'
      ? new Date(nextLesson.starts_at)
      : null

  const upcomingDrill = drills[0]

  const last3 = sortedSessions.slice(-3)
  const cleanStreak = [...last3].reverse().findIndex(s => {
    const critical = s.critical_count
    return typeof critical === 'number' && critical > 0
  })
  const consecutiveClean = cleanStreak === -1 ? last3.length : cleanStreak

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          fontFamily: 'Arial, sans-serif',
          color: TEXT_MUTED,
          fontSize: 14,
          background: WARM_BG,
        }}
      >
        Loading your progress...
      </div>
    )
  }

  if (!player) {
    return (
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          color: TEXT,
          maxWidth: 720,
          margin: '0 auto',
          padding: '40px 0',
          background: WARM_BG,
        }}
      >
        <h1 style={{ ...typography.greeting, fontSize: 22, marginBottom: 8 }}>
          Welcome to Playvia
        </h1>
        <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.6 }}>
          Your coach hasn't linked a player profile to this account yet. Ask
          them to send you an invite, then come back here to see your progress.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        color: TEXT,
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 0 40px',
        minHeight: '100%',
      }}
    >
      <style>{CSS}</style>

      <UniversalVia
        role="player"
        playerId={player.id}
        playerName={player.name || undefined}
        pageContext={{
          page: 'player-home',
          techniqueScore: currentScore ?? undefined,
          scoreDelta: delta ?? undefined,
          activeIssue:
            typeof latest?.top_issue === 'string'
              ? latest.top_issue
              : undefined,
          sessionCount: sortedSessions.length,
        }}
      />

      {currentScore !== null && (
        <div
          style={{
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>Technique score</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: TEAL, lineHeight: 1 }}>
              {currentScore}
              {delta !== null && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    marginLeft: 8,
                    color: delta > 0 ? GREEN : delta < 0 ? RED : TEXT_MUTED,
                  }}
                >
                  {delta > 0 ? '↑' : delta < 0 ? '↓' : ''}
                  {delta !== 0 ? ` ${Math.abs(delta)}` : ''}
                </span>
              )}
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: 'rgba(29,158,117,.12)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: 6,
                background: TEAL,
                borderRadius: 3,
                width: `${currentScore}%`,
              }}
            />
          </div>
        </div>
      )}

      {(pose?.length || currentScore !== null) && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 9,
            }}
          >
            Your numbers
          </div>
          <div
            className="metrics-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 7,
            }}
          >
            {pose?.slice(0, 2).map((m, i) => (
              <div
                key={i}
                style={{
                  background:
                    m.status === 'critical' || m.status === 'warning'
                      ? '#FEF9EC'
                      : WARM_BG,
                  border: `0.5px solid ${
                    m.status === 'critical' ? '#FCD34D' : BORDER
                  }`,
                  borderRadius: 12,
                  padding: '11px 12px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color:
                      m.status === 'good'
                        ? TEAL
                        : m.status === 'warning'
                          ? AMBER
                          : RED,
                    lineHeight: 1,
                  }}
                >
                  {m.measured}°
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: m.status === 'good' ? TEAL : AMBER,
                    marginTop: 2,
                  }}
                >
                  {m.status === 'good'
                    ? '✓ in range'
                    : `${m.deficit ?? 0}° off`}
                </div>
              </div>
            ))}

            <div
              style={{
                background: WARM_BG,
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: '11px 12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}
              >
                Streak
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: PURPLE,
                  lineHeight: 1,
                }}
              >
                {consecutiveClean}
              </div>
              <div
                style={{ fontSize: 9, color: PURPLE, marginTop: 2 }}
              >
                clean sessions
              </div>
            </div>

            <div
              style={{
                background: WARM_BG,
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: '11px 12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}
              >
                All time
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: TEXT,
                  lineHeight: 1,
                }}
              >
                {totalGain > 0 ? `+${totalGain}` : '—'}
              </div>
              <div
                style={{ fontSize: 9, color: TEAL, marginTop: 2 }}
              >
                pts gained
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="bottom-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: WARM_BG,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '13px 14px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            {"Today's drill"}
          </div>
          {upcomingDrill ? (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 3,
                  lineHeight: 1.3,
                }}
              >
                {String(upcomingDrill.title)}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginBottom: 12,
                }}
              >
                Assigned by your coach
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 3,
                }}
              >
                No drill assigned yet
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginBottom: 12,
                }}
              >
                Upload a video for a personalized plan
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => router.push('/player/drills')}
            style={{
              padding: '8px 0',
              borderRadius: 9,
              background: TEAL,
              border: 'none',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
              width: '100%',
            }}
          >
            {upcomingDrill ? 'View drill →' : 'Get drills →'}
          </button>
        </div>

        <div
          style={{
            background: WARM_BG,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '13px 14px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            Next lesson
          </div>
          {nextLesson && nextLessonDate ? (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 3,
                }}
              >
                {format(nextLessonDate, 'EEE MMM d')}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginBottom: 12,
                }}
              >
                {format(nextLessonDate, 'h:mm a')}
                {typeof nextLesson.notes === 'string' && nextLesson.notes
                  ? ` · ${nextLesson.notes.slice(0, 30)}...`
                  : ''}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 3,
                }}
              >
                No lesson scheduled
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginBottom: 12,
                }}
              >
                Book a session with your coach
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => router.push('/player/lessons')}
            style={{
              padding: '8px 0',
              borderRadius: 9,
              border: `0.5px solid ${BORDER}`,
              background: 'white',
              color: '#555',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
              width: '100%',
            }}
          >
            {nextLesson ? 'View lesson →' : 'Book lesson →'}
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: TEXT,
              marginBottom: 2,
            }}
          >
            {sportEmoji[player.sport || 'tennis'] || '🎾'} Add to your Reels
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>
            Upload a video and Via will measure your joint angles
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/player/reels')}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            background: TEXT,
            border: 'none',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Reels →
        </button>
      </div>
    </div>
  )
}
