'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { GlassCard } from '@/components/GlassCard'
import UniversalVia from '@/components/UniversalVia'
import { glass } from '@/lib/glass'

const TEAL = '#1D9E75'
const TEAL_DARK = '#085041'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

interface Player {
  id: string
  name: string
  email: string | null
  sport: string
  skill_level: string | null
  age: number | null
  created_at: string
  latest_score: number | null
  previous_score: number | null
  score_delta: number | null
  last_analyzed: string | null
  top_issue: string | null
  session_count: number
  score_history: number[]
  profile_id: string | null
  is_invited: boolean
}

type SortMode = 'attention' | 'alpha' | 'recent'
type SportFilter = 'all' | string

function getUrgency(player: Player): 
  'regression' | 'no_sessions' | 'stale' | 'ok' {
  if (!player.latest_score && 
      player.session_count === 0) return 'no_sessions'
  if (player.score_delta !== null && 
      player.score_delta <= -10) return 'regression'
  if (player.last_analyzed) {
    const days = Math.floor(
      (Date.now() - 
        new Date(player.last_analyzed).getTime()
      ) / 86400000
    )
    if (days > 14) return 'stale'
  }
  return 'ok'
}

function Avatar({ 
  name, 
  urgency 
}: { 
  name: string
  urgency: string 
}) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = {
    regression: { bg: '#FCEBEB', color: '#A32D2D' },
    no_sessions: { bg: '#FAEEDA', color: '#633806' },
    stale: { bg: '#FAEEDA', color: '#633806' },
    ok: { bg: '#E1F5EE', color: '#085041' },
  }
  const c = colors[urgency as keyof typeof colors] 
    || colors.ok

  return (
    <div style={{
      width: 36, height: 36,
      borderRadius: '50%',
      background: c.bg,
      color: c.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 500,
      flexShrink: 0,
      fontFamily: 'Arial, sans-serif',
    }}>
      {initials}
    </div>
  )
}

function Sparkline({ 
  scores,
  urgency,
}: { 
  scores: number[]
  urgency: string
}) {
  if (!scores.length) return (
    <div style={{ width: 28 }} />
  )

  const max = Math.max(...scores)
  const color = urgency === 'regression' 
    ? '#E24B4A' : TEAL

  return (
    <div style={{
      display: 'flex',
      gap: 2,
      alignItems: 'flex-end',
      height: 18,
      flexShrink: 0,
    }}>
      {scores.slice(-5).map((s, i, arr) => (
        <div key={i} style={{
          width: 4,
          borderRadius: 1,
          background: i === arr.length - 1 
            ? color 
            : BORDER,
          height: `${Math.max(20, (s / max) * 100)}%`,
        }} />
      ))}
    </div>
  )
}

function PlayerRow({ 
  player, 
  onClick,
  onEdit,
  onMessage,
  onDelete,
}: {
  player: Player
  onClick: () => void
  onEdit: () => void
  onMessage: () => void
  onDelete: () => void
}) {
  const urgency = getUrgency(player)
  const [showActions, setShowActions] = 
    useState(false)

  const rowBg = urgency === 'regression' 
    ? 'var(--color-background-danger)'
    : urgency === 'no_sessions' || 
      urgency === 'stale'
    ? 'var(--color-background-warning)'
    : glass.light.row.background

  const scoreColor = urgency === 'regression'
    ? 'var(--color-text-danger)'
    : player.score_delta && player.score_delta > 0
    ? TEAL_DARK
    : TEXT

  const urgencyBadge = urgency === 'regression'
    ? { label: 'Score dropped', 
        bg: '#FCEBEB', 
        color: '#A32D2D',
        border: '#F09595' }
    : urgency === 'no_sessions'
    ? { label: 'No sessions', 
        bg: '#FAEEDA', 
        color: '#633806',
        border: '#EF9F27' }
    : urgency === 'stale'
    ? { label: 'No recent session', 
        bg: '#FAEEDA', 
        color: '#633806',
        border: '#EF9F27' }
    : null

  const lastSeen = player.last_analyzed
    ? formatDistanceToNow(
        new Date(player.last_analyzed),
        { addSuffix: true }
      )
    : null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 20px',
        borderBottom: `0.5px solid ${BORDER}`,
        background: rowBg,
        cursor: 'pointer',
        transition: 'background 0.1s',
        fontFamily: 'Arial, sans-serif',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onClick}
    >
      <Avatar name={player.name} urgency={urgency} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 2,
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: TEXT,
          }}>
            {player.name}
          </span>
          {urgencyBadge && (
            <span style={{
              padding: '1px 7px',
              borderRadius: 999,
              background: urgencyBadge.bg,
              border: `0.5px solid ${urgencyBadge.border}`,
              fontSize: 10,
              color: urgencyBadge.color,
            }}>
              {urgencyBadge.label}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 11,
          color: TEXT_MUTED,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {[
            player.sport 
              ? player.sport.charAt(0).toUpperCase() + 
                player.sport.slice(1)
              : null,
            player.skill_level 
              ? player.skill_level
                  .charAt(0).toUpperCase() + 
                player.skill_level.slice(1)
              : null,
            lastSeen || 'Never analyzed',
            player.top_issue || null,
          ].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Sparkline */}
      {player.score_history.length > 0 && (
        <Sparkline 
          scores={player.score_history} 
          urgency={urgency}
        />
      )}

      {/* Score */}
      <div style={{
        textAlign: 'right',
        minWidth: 44,
        flexShrink: 0,
      }}>
        {player.latest_score !== null ? (
          <>
            <div style={{
              fontSize: 18,
              fontWeight: 500,
              color: scoreColor,
              lineHeight: 1,
            }}>
              {player.latest_score}
            </div>
            {player.score_delta !== null && 
              player.score_delta !== 0 && (
              <div style={{
                fontSize: 10,
                color: player.score_delta > 0 
                  ? TEAL : 'var(--color-text-danger)',
              }}>
                {player.score_delta > 0 ? '↑' : '↓'}{' '}
                {Math.abs(player.score_delta)}
              </div>
            )}
          </>
        ) : (
          <div style={{
            fontSize: 13,
            color: TEXT_MUTED,
          }}>
            —
          </div>
        )}
      </div>

      {/* Action buttons — show on hover */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginLeft: 4,
        opacity: showActions ? 1 : 0,
        transition: 'opacity 0.15s',
        flexShrink: 0,
      }}>
        <button
          onClick={e => { 
            e.stopPropagation()
            onMessage() 
          }}
          aria-label="Message player"
          style={{
            width: 30, height: 30,
            borderRadius: 8,
            border: `0.5px solid ${BORDER}`,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: TEXT_SEC,
            fontSize: 14,
          }}
        >
          <svg width="14" height="14" 
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16v12H4z"/>
            <path d="M4 16l4-4"/>
          </svg>
        </button>
        <button
          onClick={e => { 
            e.stopPropagation()
            onEdit() 
          }}
          aria-label="Edit player account"
          style={{
            width: 30, height: 30,
            borderRadius: 8,
            border: `0.5px solid ${BORDER}`,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: TEXT_SEC,
            fontSize: 14,
          }}
        >
          <svg width="14" height="14"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          onClick={e => { 
            e.stopPropagation()
            if (confirm(
              `Delete ${player.name}? ` +
              'This cannot be undone.'
            )) onDelete()
          }}
          aria-label="Delete player"
          style={{
            width: 30, height: 30,
            borderRadius: 8,
            border: `0.5px solid ${BORDER}`,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text-danger)',
            fontSize: 14,
          }}
        >
          <svg width="14" height="14"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Edit player modal ────────────────────────────
function EditPlayerModal({
  player,
  onClose,
  onSaved,
}: {
  player: Player
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [name, setName] = useState(player.name)
  const [email, setEmail] = useState(
    player.email || ''
  )
  const [sport, setSport] = useState(player.sport)
  const [skillLevel, setSkillLevel] = useState(
    player.skill_level || 'beginner'
  )
  const [age, setAge] = useState(
    player.age?.toString() || ''
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase
      .from('players')
      .update({
        name,
        email: email || null,
        sport,
        skill_level: skillLevel,
        age: age ? parseInt(age) : null,
      })
      .eq('id', player.id)
    onSaved()
    setSaving(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 9,
    border: `0.5px solid ${BORDER}`,
    background: WARM_BG,
    fontSize: 13,
    color: TEXT,
    fontFamily: 'Arial, sans-serif',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.45)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: 'Arial, sans-serif',
    }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div style={{
        background: 'white',
        borderRadius: 16,
        width: '100%',
        maxWidth: 420,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: `0.5px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: 15,
            fontWeight: 500,
            color: TEXT,
          }}>
            Edit player
          </div>
          <button
            onClick={onClose}
            style={{
              background: WARM_BG,
              border: `0.5px solid ${BORDER}`,
              borderRadius: 7,
              width: 28, height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              color: TEXT_MUTED,
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="player@email.com"
              style={inputStyle}
            />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}>
            <div>
              <label style={labelStyle}>Sport</label>
              <select
                value={sport}
                onChange={e => setSport(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                }}
              >
                <option value="tennis">Tennis</option>
                <option value="golf">Golf</option>
                <option value="baseball">Baseball</option>
                <option value="basketball">Basketball</option>
                <option value="pickleball">Pickleball</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Level</label>
              <select
                value={skillLevel}
                onChange={e => 
                  setSkillLevel(e.target.value)
                }
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Age</label>
            <input
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="e.g. 16"
              type="number"
              style={inputStyle}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 4,
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: 10,
                background: 'white',
                border: `0.5px solid ${BORDER}`,
                color: TEXT_SEC,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                flex: 2,
                padding: '11px',
                borderRadius: 10,
                background: saving ? '#ccc' : TEAL,
                border: 'none',
                color: 'white',
                fontSize: 13,
                fontWeight: 500,
                cursor: saving
                  ? 'default' : 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────
export default function PlayersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] =
    useState<SortMode>('attention')
  const [sportFilter, setSportFilter] =
    useState<SportFilter>('all')
  const [editingPlayer, setEditingPlayer] =
    useState<Player | null>(null)

  useEffect(() => {
    loadPlayers()
  }, [])

  async function loadPlayers() {
    setLoading(true)

    // Fetch players with their latest
    // analysis session data
    const { data: playerRows } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true })

    if (!playerRows) {
      setLoading(false)
      return
    }

    // For each player get their sessions
    const enriched = await Promise.all(
      playerRows.map(async p => {
        const { data: sessions } = await supabase
          .from('analysis_sessions')
          .select(
            'overall_score, analyzed_at, top_issue'
          )
          .eq('player_id', p.id)
          .order('analyzed_at', { ascending: true })

        const sortedSessions = sessions || []
        const latest = sortedSessions[
          sortedSessions.length - 1
        ]
        const prev = sortedSessions[
          sortedSessions.length - 2
        ]

        const scoreHistory = sortedSessions
          .map(s => s.overall_score)
          .filter(Boolean)
          .slice(-5)

        const scoreDelta =
          latest?.overall_score && 
          prev?.overall_score
            ? latest.overall_score - 
              prev.overall_score
            : null

        // Get profile for invite status
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('player_id', p.id)
          .single()

        return {
          ...p,
          latest_score: 
            latest?.overall_score || null,
          previous_score: 
            prev?.overall_score || null,
          score_delta: scoreDelta,
          last_analyzed: 
            latest?.analyzed_at || null,
          top_issue: latest?.top_issue || null,
          session_count: sortedSessions.length,
          score_history: scoreHistory,
          profile_id: profile?.id || null,
          is_invited: !!profile,
        } as Player
      })
    )

    setPlayers(enriched)
    setLoading(false)
  }

  async function deletePlayer(player: Player) {
    // Delete sessions, drills, profile, player
    await supabase
      .from('analysis_sessions')
      .delete()
      .eq('player_id', player.id)

    await supabase
      .from('drills')
      .delete()
      .eq('player_id', player.id)

    if (player.profile_id) {
      // Delete auth user via service role
      // This requires a server action
      await fetch('/api/admin/delete-player', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          playerId: player.id,
          profileId: player.profile_id,
        }),
      })
    }

    await supabase
      .from('players')
      .delete()
      .eq('id', player.id)

    loadPlayers()
  }

  function messagePlayer(player: Player) {
    if (!player.email) {
      alert(`No email on file for ${player.name}`)
      return
    }
    window.open(`mailto:${player.email}`)
  }

  // ── Filtering + sorting ──────────────────────
  const sports = useMemo(() => {
    const s = new Set(players.map(p => p.sport))
    return Array.from(s).filter(Boolean)
  }, [players])

  const filtered = useMemo(() => {
    let list = players.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(
          search.toLowerCase()
        ) ||
        (p.email || '').toLowerCase().includes(
          search.toLowerCase()
        )
      const matchSport = sportFilter === 'all' ||
        p.sport === sportFilter
      return matchSearch && matchSport
    })

    if (sortMode === 'attention') {
      const urgencyOrder = {
        regression: 0,
        no_sessions: 1,
        stale: 2,
        ok: 3,
      }
      list = [...list].sort((a, b) => {
        const ua = urgencyOrder[getUrgency(a)]
        const ub = urgencyOrder[getUrgency(b)]
        if (ua !== ub) return ua - ub
        return a.name.localeCompare(b.name)
      })
    } else if (sortMode === 'alpha') {
      list = [...list].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    } else if (sortMode === 'recent') {
      list = [...list].sort((a, b) => {
        if (!a.last_analyzed) return 1
        if (!b.last_analyzed) return -1
        return new Date(b.last_analyzed).getTime() -
          new Date(a.last_analyzed).getTime()
      })
    }

    return list
  }, [players, search, sportFilter, sortMode])

  // ── Section grouping for attention sort ──────
  const sections = useMemo(() => {
    if (sortMode !== 'attention') {
      return [{ label: null, players: filtered }]
    }
    const attention = filtered.filter(p => {
      const u = getUrgency(p)
      return u === 'regression' || 
             u === 'no_sessions' ||
             u === 'stale'
    })
    const active = filtered.filter(p =>
      getUrgency(p) === 'ok'
    )
    return [
      attention.length > 0 
        ? { label: 'Needs attention', players: attention }
        : null,
      active.length > 0
        ? { label: 'Active', players: active }
        : null,
    ].filter(Boolean) as {
      label: string | null
      players: Player[]
    }[]
  }, [filtered, sortMode])

  const needsAttentionCount = useMemo(() =>
    players.filter(p => {
      const u = getUrgency(p)
      return u !== 'ok'
    }).length,
    [players]
  )

  if (loading) {
    return (
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 24px',
        fontFamily: 'Arial, sans-serif',
      }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            height: 56,
            borderRadius: 10,
            background: WARM_BG,
            marginBottom: 8,
            opacity: 1 - i * 0.15,
          }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: '0 0 40px',
      fontFamily: 'Arial, sans-serif',
    }}>

      <UniversalVia role="coach" pageContext={{ page: 'players-list' }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: TEXT,
            letterSpacing: '-.5px',
            marginBottom: 3,
          }}>
            Players
          </h1>
          <p style={{
            fontSize: 12,
            color: TEXT_MUTED,
          }}>
            {players.length} players
            {needsAttentionCount > 0 && (
              <span style={{
                color: 'var(--color-text-danger)',
                marginLeft: 6,
              }}>
                · {needsAttentionCount} need attention
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => 
            router.push('/dashboard/players/new')
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 16px',
            borderRadius: 10,
            background: TEAL,
            border: 'none',
            color: 'white',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <svg width="14" height="14"
            viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add player
        </button>
      </div>

      {/* Search + filters */}
      <GlassCard mode="light" style={{ borderRadius: '20px 20px 0 0', padding: '12px 18px' }}>
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 200,
          ...glass.light.input,
          borderRadius: 999,
          padding: '8px 14px',
        }}>
          <svg width="15" height="15"
            viewBox="0 0 24 24" fill="none"
            stroke={TEXT_MUTED} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: TEXT,
              fontFamily: 'Arial, sans-serif',
            }}
          />
        </div>

        {/* Sport filter */}
        {sports.length > 1 && (
          <select
            value={sportFilter}
            onChange={e => 
              setSportFilter(e.target.value)
            }
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: `0.5px solid ${BORDER}`,
              background: WARM_BG,
              fontSize: 12,
              color: TEXT_SEC,
              fontFamily: 'Arial, sans-serif',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All sports</option>
            {sports.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + 
                  s.slice(1)}
              </option>
            ))}
          </select>
        )}

        {/* Sort */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(
            [
              { key: 'attention', label: 'Attention' },
              { key: 'alpha', label: 'A–Z' },
              { key: 'recent', label: 'Recent' },
            ] as { key: SortMode; label: string }[]
          ).map(s => (
            <button
              key={s.key}
              onClick={() => setSortMode(s.key)}
              style={{
                padding: '5px 10px',
                borderRadius: 7,
                ...(sortMode === s.key
                  ? { background: TEXT, color: 'white', border: `0.5px solid ${TEXT}` }
                  : { ...glass.light.chip, color: TEXT_SEC }),
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
                transition: 'all 0.1s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        </div>
      </GlassCard>

      {/* Player list */}
      <GlassCard mode="light" style={{ borderRadius: '0 0 20px 20px', padding: 0 }}>
        {sections.map((section, si) => (
          <div key={si}>
            {section.label &&
              (section.label === 'Needs attention' ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 20px 6px',
                    background: 'var(--color-background-danger)',
                    borderTop:
                      si > 0
                        ? '0.5px solid var(--color-border-danger)'
                        : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-text-danger)',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--color-text-danger)',
                      textTransform: 'uppercase',
                      letterSpacing: '.07em',
                    }}
                  >
                    {section.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--color-text-danger)',
                      opacity: 0.7,
                    }}
                  >
                    · {section.players.length} player
                    {section.players.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 20px 6px',
                    background: 'rgba(255,255,255,.25)',
                    borderTop: si > 0 ? '0.5px solid rgba(255,255,255,.35)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#1D9E75',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '.07em',
                    }}
                  >
                    {section.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--color-text-secondary)',
                      opacity: 0.7,
                    }}
                  >
                    · {section.players.length} player
                    {section.players.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            {section.players.map(player => (
              <PlayerRow
                key={player.id}
                player={player}
                onClick={() =>
                  router.push(
                    `/dashboard/players/${player.id}`
                  )
                }
                onEdit={() => 
                  setEditingPlayer(player)
                }
                onMessage={() => 
                  messagePlayer(player)
                }
                onDelete={() => 
                  deletePlayer(player)
                }
              />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: TEXT_MUTED,
            fontSize: 13,
          }}>
            {search
              ? `No players matching "${search}"`
              : 'No players yet. Add your first player.'}
          </div>
        )}
      </GlassCard>

      {/* Edit modal */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSaved={() => {
            setEditingPlayer(null)
            loadPlayers()
          }}
        />
      )}
    </div>
  )
}
