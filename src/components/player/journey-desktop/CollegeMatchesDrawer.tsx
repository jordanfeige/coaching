'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  X,
} from 'lucide-react'
import { useAskVia } from '@/components/player/ask-via/AskViaContext'
import { brand, fonts } from '@/lib/brand'
import {
  BUCKET_STYLES,
  SAVED_FILTER_STYLE,
  factorFitLabel,
  formatDivision,
  type CollegeMatchDrawerTab,
  type CollegeMatchRow,
} from '@/lib/college-matching-ui'

type PlayerSnapshot = {
  utr: number | null
  projectedUtr?: number | null
  classYear?: number | null
  gpa: number | null
  sat: number | null
  targetDivision: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  initialTab?: CollegeMatchDrawerTab
  matches: CollegeMatchRow[]
  summary: { total: number; likely: number; target: number; reach: number }
  playerSnapshot: PlayerSnapshot | null
  onMatchesChange: (matches: CollegeMatchRow[]) => void
}

function tennisProgram(row: CollegeMatchRow) {
  const tp = row.schools.school_tennis_programs
  return Array.isArray(tp) ? tp[0] : tp
}

function FactorRow({
  label,
  score,
  you,
  them,
}: {
  label: string
  score: number | null
  you: string
  them: string
}) {
  const n = score ?? 0
  const fit = factorFitLabel(n)
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
          fontFamily: fonts.sans,
          fontSize: 12,
        }}
      >
        <span style={{ fontWeight: 700, color: brand.ink }}>{label}</span>
        <span style={{ color: brand.sub }}>{fit}</span>
      </div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 11,
          color: brand.muted,
          marginBottom: 6,
        }}
      >
        You: {you} · Them: {them}
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: brand.lineSoft,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, n))}%`,
            height: '100%',
            background: brand.tealHex,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  )
}

function SchoolCard({
  row,
  playerSnapshot,
  onToggleSave,
}: {
  row: CollegeMatchRow
  playerSnapshot: PlayerSnapshot | null
  onToggleSave: (schoolId: string, saved: boolean) => void
}) {
  const { askVia } = useAskVia()
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const s = BUCKET_STYLES[row.bucket]
  const school = row.schools
  const tp = tennisProgram(row)
  const loc = [school.city, school.state].filter(Boolean).join(', ')
  const roster =
    row.school_roster_avg ?? tp?.roster_avg_utr ?? null

  async function toggleSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (saving) return
    const next = !row.saved
    onToggleSave(school.ipeds_id, next)
    setSaving(true)
    try {
      if (next) {
        await fetch('/api/journey/saved-schools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId: school.ipeds_id }),
        })
      } else {
        await fetch(
          `/api/journey/saved-schools?schoolId=${encodeURIComponent(school.ipeds_id)}`,
          { method: 'DELETE' },
        )
      }
    } catch {
      onToggleSave(school.ipeds_id, !next)
    } finally {
      setSaving(false)
    }
  }

  const satRange =
    school.sat_25th != null && school.sat_75th != null
      ? `${school.sat_25th}–${school.sat_75th}`
      : '—'

  const toggleExpanded = () => setExpanded(v => !v)

  return (
    <div
      style={{
        borderBottom: `1px solid ${brand.lineSoft}`,
        background: 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
        <div style={{ width: 4, background: s.bar, flexShrink: 0 }} />
        <div
          role="button"
          tabIndex={0}
          onClick={toggleExpanded}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleExpanded()
            }
          }}
          aria-expanded={expanded}
          style={{
            flex: 1,
            padding: '14px 16px 12px',
            cursor: 'pointer',
            textAlign: 'left',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 17,
                    fontWeight: 700,
                    color: brand.ink,
                  }}
                >
                  {school.name}
                </span>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: s.bg,
                    color: s.text,
                  }}
                >
                  {s.label}
                </span>
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: brand.sub,
                  marginTop: 6,
                }}
              >
                📍 {loc || '—'} · 🏫 {formatDivision(tp?.division)} · 🏆 Roster
                avg UTR {roster != null ? roster.toFixed(1) : '—'}
              </div>
              {row.rationale ? (
                <p
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: brand.sub,
                    margin: '10px 0 0',
                    paddingLeft: 8,
                    lineHeight: 1.45,
                  }}
                >
                  {row.rationale}
                </p>
              ) : null}
            </div>
            {expanded ? (
              <ChevronUp size={18} color={brand.muted} aria-hidden />
            ) : (
              <ChevronDown size={18} color={brand.muted} aria-hidden />
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSave}
          aria-label={row.saved ? 'Unsave school' : 'Save school'}
          style={{
            alignSelf: 'center',
            flexShrink: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '14px 12px',
            marginRight: 4,
            color: row.saved ? brand.tealDarkHex : brand.muted,
          }}
        >
          <Bookmark size={18} fill={row.saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {expanded ? (
        <div
          style={{
            margin: '0 16px 16px',
            marginLeft: 20,
            padding: '16px 18px',
            background: brand.paper,
            borderRadius: 12,
            border: `1px solid ${brand.line}`,
          }}
        >
          <FactorRow
            label="Tennis fit"
            score={row.tennis_fit}
            you={
              playerSnapshot?.projectedUtr != null &&
              playerSnapshot.classYear != null &&
              playerSnapshot.projectedUtr !== playerSnapshot.utr
                ? `Current ${playerSnapshot.utr} → Projected ${playerSnapshot.projectedUtr.toFixed(1)} by '${String(playerSnapshot.classYear).slice(-2)}`
                : row.player_utr_snapshot != null
                  ? `UTR ${row.player_utr_snapshot}`
                  : '—'
            }
            them={
              roster != null ? `Roster avg ${roster.toFixed(1)}` : '—'
            }
          />
          <FactorRow
            label="Academic fit"
            score={row.academic_fit}
            you={
              row.player_sat_snapshot != null
                ? `SAT ${row.player_sat_snapshot}`
                : row.player_gpa_snapshot != null
                  ? `GPA ${row.player_gpa_snapshot}`
                  : '—'
            }
            them={`SAT ${satRange}`}
          />
          <FactorRow
            label="Division fit"
            score={row.division_fit}
            you="Your target"
            them={formatDivision(tp?.division)}
          />
          <FactorRow
            label="Geography fit"
            score={row.geo_fit}
            you="Your prefs"
            them={school.state ?? school.region ?? '—'}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: brand.muted,
                }}
              >
                Academic tier
              </div>
              <div style={{ fontFamily: fonts.sans, fontSize: 13, marginTop: 4 }}>
                {school.academic_tier?.replace(/_/g, ' ') ?? '—'}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: brand.muted,
                }}
              >
                Admit rate
              </div>
              <div style={{ fontFamily: fonts.sans, fontSize: 13, marginTop: 4 }}>
                {school.admission_rate != null
                  ? `${Math.round(school.admission_rate * 100)}%`
                  : '—'}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: brand.muted,
                }}
              >
                Net price/yr
              </div>
              <div style={{ fontFamily: fonts.sans, fontSize: 13, marginTop: 4 }}>
                {school.net_price != null
                  ? `$${Math.round(school.net_price / 1000)}k`
                  : '—'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              type="button"
              onClick={() =>
                askVia({
                  prompt: `Tell me about ${school.name} as a college tennis fit for me.`,
                  context: `college-match:${school.ipeds_id}`,
                })
              }
              style={{
                flex: 1,
                minWidth: 140,
                padding: '10px 14px',
                borderRadius: 10,
                border: `1px solid ${brand.tealHex}`,
                background: brand.tealTint,
                fontFamily: fonts.sans,
                fontSize: 13,
                fontWeight: 700,
                color: brand.tealDarkHex,
                cursor: 'pointer',
              }}
            >
              Ask Via about this school
            </button>
            {school.url ? (
              <a
                href={school.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${brand.line}`,
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: brand.sub,
                  textDecoration: 'none',
                }}
              >
                Visit site
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>

          <p
            style={{
              fontFamily: fonts.sans,
              fontSize: 10,
              color: brand.muted,
              margin: '14px 0 0',
              lineHeight: 1.45,
            }}
          >
            Roster via UTR · Admissions via College Scorecard · Fit is
            roster-relevant, not a recruitment guarantee.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export default function CollegeMatchesDrawer({
  open,
  onClose,
  initialTab = 'all',
  matches,
  summary,
  playerSnapshot,
  onMatchesChange,
}: Props) {
  const [tab, setTab] = useState<CollegeMatchDrawerTab>('all')
  const [query, setQuery] = useState('')
  const [showBelow, setShowBelow] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      setTab(initialTab)
    } else {
      setQuery('')
      setShowBelow(false)
    }
  }, [open, initialTab])

  const handleToggleSave = useCallback(
    (schoolId: string, saved: boolean) => {
      onMatchesChange(
        matches.map(m =>
          m.schools.ipeds_id === schoolId ? { ...m, saved } : m,
        ),
      )
    },
    [matches, onMatchesChange],
  )

  const filtered = useMemo(() => {
    let list = matches
    if (tab === 'saved') {
      list = list.filter(m => m.saved)
    } else if (tab !== 'all') {
      list = list.filter(m => m.bucket === tab)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(m => m.schools.name.toLowerCase().includes(q))
    }
    return list
  }, [matches, tab, query])

  const snapshotLine = useMemo(() => {
    if (!playerSnapshot) return ''
    const parts: string[] = []
    if (playerSnapshot.utr != null) {
      const proj = playerSnapshot.projectedUtr
      if (
        proj != null &&
        playerSnapshot.classYear != null &&
        proj !== playerSnapshot.utr
      ) {
        parts.push(
          `UTR ${playerSnapshot.utr} → ${proj.toFixed(1)} by '${String(playerSnapshot.classYear).slice(-2)}`,
        )
      } else {
        parts.push(`UTR ${playerSnapshot.utr}`)
      }
    }
    if (playerSnapshot.gpa != null) parts.push(`GPA ${playerSnapshot.gpa}`)
    if (playerSnapshot.sat != null) parts.push(`SAT ${playerSnapshot.sat}`)
    if (playerSnapshot.targetDivision) {
      parts.push(playerSnapshot.targetDivision)
    }
    return parts.length ? `Based on ${parts.join(' · ')}` : ''
  }, [playerSnapshot])

  if (!open) return null

  const savedCount = matches.filter(m => m.saved).length

  const tabs: { id: CollegeMatchDrawerTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: summary.total },
    { id: 'likely', label: 'Likely', count: summary.likely },
    { id: 'target', label: 'Target', count: summary.target },
    { id: 'reach', label: 'Reach', count: summary.reach },
    { id: 'saved', label: SAVED_FILTER_STYLE.label, count: savedCount },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="College matches"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          border: 'none',
          cursor: 'pointer',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: 'min(60vw, 720px)',
          maxWidth: '100vw',
          height: '100%',
          background: 'white',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'collegeDrawerIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="college-matches-drawer-panel"
      >
        <style>{`
          @keyframes collegeDrawerIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @media (max-width: 1023px) {
            .college-matches-drawer-panel {
              width: 100vw !important;
            }
          }
        `}</style>

        <div
          style={{
            flexShrink: 0,
            padding: '20px 22px 16px',
            borderBottom: `1px solid ${brand.line}`,
            background: 'white',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: brand.sub,
                }}
              >
                Your college matches
              </div>
              <h2
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 22,
                  fontWeight: 700,
                  color: brand.ink,
                  margin: '6px 0 4px',
                }}
              >
                {summary.total} schools, matched to your Journey.
              </h2>
              {snapshotLine ? (
                <p
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 13,
                    fontStyle: 'italic',
                    color: brand.sub,
                    margin: 0,
                  }}
                >
                  {snapshotLine}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: brand.lineSoft,
                borderRadius: 8,
                width: 36,
                height: 36,
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0,
                color: brand.ink,
              }}
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 16,
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: brand.muted,
                }}
              />
              <input
                type="search"
                placeholder="Search schools"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 10,
                  border: `1px solid ${brand.line}`,
                  fontFamily: fonts.sans,
                  fontSize: 14,
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowBelow(v => !v)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${brand.line}`,
                background: showBelow ? brand.tealTint : 'white',
                fontFamily: fonts.sans,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Filters
            </button>
          </div>

          {showBelow ? (
            <p
              style={{
                fontFamily: fonts.sans,
                fontSize: 11,
                color: brand.muted,
                margin: '8px 0 0',
              }}
            >
              Schools below 40 match score stay hidden in v1. Complete Journey
              inputs to refresh matches.
            </p>
          ) : null}

          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginTop: 12,
            }}
          >
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${tab === t.id ? brand.tealHex : brand.line}`,
                  background: tab === t.id ? brand.tealTint : 'white',
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  fontWeight: 700,
                  color: tab === t.id ? brand.tealDarkHex : brand.sub,
                  cursor: 'pointer',
                }}
              >
                {t.label} {t.count}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {filtered.length === 0 ? (
            <p
              style={{
                padding: 24,
                fontFamily: fonts.sans,
                fontSize: 14,
                color: brand.sub,
              }}
            >
              {tab === 'saved'
                ? 'No saved schools yet. Bookmark schools from the list.'
                : 'No schools match this filter.'}
            </p>
          ) : (
            filtered.map(row => (
              <SchoolCard
                key={row.schools.ipeds_id}
                row={row}
                playerSnapshot={playerSnapshot}
                onToggleSave={handleToggleSave}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
