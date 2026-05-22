'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { CustomDrillForm } from '@/components/player/training/CustomDrillForm'

export type LibraryDrillSummary = {
  id: string
  name: string
  primary_category: string
  drill_type: string | null
  skill_level: string
  duration_minutes: number
  mode: string
  requires: string[] | null
  description: string
  source: string
  created_by_player_id: string | null
  created_by_coach_id: string | null
}

const CATEGORIES = [
  'All',
  'Forehand',
  'Backhand',
  'Serve',
  'Volley',
  'Footwork',
  'Match Play',
  'Mental',
]
const SKILL_LEVELS = ['All', 'beginner', 'intermediate', 'advanced']

type Props = {
  drills: LibraryDrillSummary[]
  playerId: string
}

export function DrillLibraryClient({ drills, playerId }: Props) {
  const [tab, setTab] = useState<'all' | 'mine' | 'curated'>('all')
  const [category, setCategory] = useState('All')
  const [skillLevel, setSkillLevel] = useState('All')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [localDrills, setLocalDrills] = useState(drills)

  const filtered = useMemo(() => {
    return localDrills.filter(d => {
      if (tab === 'mine' && d.created_by_player_id !== playerId) return false
      if (tab === 'curated' && d.source !== 'curated_playvia_v1') return false
      if (category !== 'All' && d.primary_category !== category) return false
      if (skillLevel !== 'All' && d.skill_level !== skillLevel) return false
      const q = search.trim().toLowerCase()
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !d.description.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [localDrills, tab, category, skillLevel, search, playerId])

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: 99,
            cursor: 'pointer',
            background: '#0F6E56',
            color: 'white',
            border: 'none',
          }}
        >
          <Plus size={14} aria-hidden />
          Add custom drill
        </button>
      </div>

      <div
        style={{
          display: 'inline-flex',
          gap: 2,
          background: 'white',
          border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 8,
          padding: 3,
          marginBottom: 12,
        }}
      >
        {(
          [
            { key: 'all' as const, label: 'All' },
            { key: 'curated' as const, label: 'Curated' },
            { key: 'mine' as const, label: 'My drills' },
          ] as const
        ).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 6,
              color: tab === t.key ? 'white' : '#666',
              background: tab === t.key ? '#0A2A22' : 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search drills…"
          style={{
            flex: '1 1 200px',
            padding: '8px 12px',
            background: 'white',
            border: '0.5px solid rgba(0,0,0,0.12)',
            borderRadius: 99,
            fontSize: 12,
            outline: 'none',
          }}
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={selectStyle}
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={skillLevel}
          onChange={e => setSkillLevel(e.target.value)}
          style={selectStyle}
        >
          {SKILL_LEVELS.map(s => (
            <option key={s} value={s}>
              {s === 'All' ? 'All levels' : s}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 10,
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 40,
              textAlign: 'center',
              color: '#888',
              fontStyle: 'italic',
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 13,
            }}
          >
            No drills match your filters. Try adjusting them or ask Via for a custom
            drill.
          </div>
        ) : (
          filtered.map(d => <DrillCard key={d.id} drill={d} />)
        )}
      </div>

      {showAddForm && (
        <CustomDrillForm
          playerId={playerId}
          onClose={() => setShowAddForm(false)}
          onSaved={async () => {
            setShowAddForm(false)
            const res = await fetch('/api/player/drills/library/list')
            if (res.ok) {
              const data = (await res.json()) as { drills: LibraryDrillSummary[] }
              setLocalDrills(data.drills)
            } else {
              window.location.reload()
            }
          }}
        />
      )}
    </>
  )
}

function DrillCard({ drill }: { drill: LibraryDrillSummary }) {
  return (
    <Link
      href={`/player/training/drills/${drill.id}`}
      style={{
        background: 'white',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 10,
        padding: '12px 14px',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: '#0F6E56',
            background: '#E1F5EE',
            padding: '2px 7px',
            borderRadius: 99,
            textTransform: 'uppercase',
          }}
        >
          {drill.primary_category}
        </span>
        <span style={{ fontSize: 10, color: '#888' }}>{drill.duration_minutes} min</span>
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 14,
          fontWeight: 500,
          margin: '0 0 6px',
          color: '#111',
        }}
      >
        {drill.name}
      </h3>
      <p
        style={{
          fontSize: 11,
          color: '#666',
          lineHeight: 1.5,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {drill.description}
      </p>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={pillStyle}>{drill.skill_level}</span>
        <span style={pillStyle}>{drill.mode}</span>
      </div>
    </Link>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 99,
  border: '0.5px solid rgba(0,0,0,0.12)',
  background: 'white',
  fontSize: 12,
}

const pillStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#666',
  background: 'rgba(0,0,0,0.04)',
  padding: '2px 7px',
  borderRadius: 99,
}
