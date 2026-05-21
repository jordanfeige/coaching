'use client'

import { useEffect, useState } from 'react'
import { usePageReady } from '@/contexts/PageLoadingContext'
import { ChevronDown } from 'lucide-react'
import {
  eventLevelStyle,
  formatEventLevelLabel,
  formatMatchDate,
  isPlayingUp,
  type ExposureMatchRow,
} from '@/lib/exposure-match-history'

type ApiResponse = {
  playerBracket: string | null
  categories: {
    quality_wins: ExposureMatchRow[]
    other_wins: ExposureMatchRow[]
    losses: ExposureMatchRow[]
  }
  counts: {
    quality_wins: number
    other_wins: number
    losses: number
    total: number
  }
}

type Variant = 'quality' | 'other' | 'loss'

export function ExposureMatchHistory() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/journey/exposure/matches')
      .then(r => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  usePageReady(!loading)

  if (loading) return null
  if (!data || data.counts.total === 0) return <EmptyState />

  const { categories, counts, playerBracket } = data

  return (
    <>
      <style>{`
        @keyframes exposureMatchPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (min-width: 640px) {
          .exposure-match-subtitle { display: inline !important; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <CategorySection
          title="Quality wins"
          subtitle="Opponent UTR ≥ bracket peer"
          count={counts.quality_wins}
          matches={categories.quality_wins}
          accent="#0F6E56"
          countBg="rgba(15,110,86,0.1)"
          playerBracket={playerBracket}
          expandedId={expandedId}
          onToggle={setExpandedId}
          variant="quality"
          capAt={null}
        />
        <CategorySection
          title="Wins (below your level)"
          subtitle="Opponent below bracket peer UTR"
          count={counts.other_wins}
          matches={categories.other_wins}
          accent="#666"
          countBg="rgba(102,102,102,0.1)"
          playerBracket={playerBracket}
          expandedId={expandedId}
          onToggle={setExpandedId}
          variant="other"
          capAt={5}
        />
        <CategorySection
          title="Losses"
          subtitle={null}
          count={counts.losses}
          matches={categories.losses}
          accent="#854F0B"
          countBg="rgba(133,79,11,0.1)"
          playerBracket={playerBracket}
          expandedId={expandedId}
          onToggle={setExpandedId}
          variant="loss"
          capAt={null}
        />
      </div>
    </>
  )
}

function CategorySection({
  title,
  subtitle,
  count,
  matches,
  accent,
  countBg,
  playerBracket,
  expandedId,
  onToggle,
  variant,
  capAt,
}: {
  title: string
  subtitle: string | null
  count: number
  matches: ExposureMatchRow[]
  accent: string
  countBg: string
  playerBracket: string | null
  expandedId: string | null
  onToggle: (id: string | null) => void
  variant: Variant
  capAt: number | null
}) {
  const displayMatches =
    capAt != null && matches.length > capAt ? matches.slice(0, capAt) : matches
  const hiddenCount =
    capAt != null && matches.length > capAt ? matches.length - capAt : 0

  if (matches.length === 0) {
    return (
      <div>
        <CategoryHeader
          title={title}
          subtitle={subtitle}
          count={count}
          accent={accent}
          countBg={countBg}
        />
        <div
          style={{
            fontSize: 13,
            color: '#888',
            fontStyle: 'italic',
            padding: '12px 0',
            fontFamily: 'Georgia, serif',
          }}
        >
          {emptyCopyForVariant(variant)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <CategoryHeader
        title={title}
        subtitle={subtitle}
        count={count}
        accent={accent}
        countBg={countBg}
      />
      <div>
        {displayMatches.map((m, i) => (
          <MatchRow
            key={m.id}
            match={m}
            playerBracket={playerBracket}
            isExpanded={expandedId === m.id}
            isLast={i === displayMatches.length - 1 && hiddenCount === 0}
            onToggle={() => onToggle(expandedId === m.id ? null : m.id)}
            variant={variant}
          />
        ))}
        {hiddenCount > 0 ? (
          <div
            style={{
              fontSize: 12,
              color: '#888',
              textAlign: 'center',
              padding: '10px 0 0',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
            }}
          >
            + {hiddenCount} more
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CategoryHeader({
  title,
  subtitle,
  count,
  accent,
  countBg,
}: {
  title: string
  subtitle: string | null
  count: number
  accent: string
  countBg: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        marginBottom: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h4
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            fontWeight: 500,
            color: '#111',
            margin: 0,
          }}
        >
          {title}
        </h4>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: accent,
            background: countBg,
            padding: '2px 8px',
            borderRadius: 99,
            letterSpacing: 0.5,
          }}
        >
          {count}
        </span>
      </div>
      {subtitle ? (
        <span
          className="exposure-match-subtitle"
          style={{
            display: 'none',
            fontSize: 11,
            color: '#888',
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
          }}
        >
          {subtitle}
        </span>
      ) : null}
    </div>
  )
}

function MatchRow({
  match,
  playerBracket,
  isExpanded,
  isLast,
  onToggle,
  variant,
}: {
  match: ExposureMatchRow
  playerBracket: string | null
  isExpanded: boolean
  isLast: boolean
  onToggle: () => void
  variant: Variant
}) {
  const resultLabel = variant === 'loss' ? 'L' : 'W'
  const verb = variant === 'loss' ? 'lost to' : 'beat'
  const resultColor = variant === 'loss' ? '#854F0B' : '#0F6E56'
  const resultBg =
    variant === 'loss' ? 'rgba(133,79,11,0.12)' : 'rgba(15,110,86,0.12)'

  const up = isPlayingUp(playerBracket, match.event_division)
  const divisionLabel = match.event_division
    ? up
      ? `${match.event_division} · up`
      : match.event_division
    : null
  const divisionStyle = up
    ? { color: '#0F6E56', background: 'rgba(15,110,86,0.12)' }
    : { color: '#666', background: 'rgba(102,102,102,0.1)' }

  const levelStyle = eventLevelStyle(match.event_level)
  const levelLabel = formatEventLevelLabel(match.event_level)

  const rowBorder =
    isExpanded || isLast ? 'none' : '0.5px solid rgba(0,0,0,0.06)'

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '13px 0',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: rowBorder,
          background: isExpanded ? 'rgba(15,110,86,0.025)' : 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => {
          if (!isExpanded) {
            e.currentTarget.style.background = 'rgba(0,0,0,0.015)'
          }
        }}
        onMouseLeave={e => {
          if (!isExpanded) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: resultBg,
            color: resultColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 500,
            flexShrink: 0,
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
          }}
        >
          {resultLabel}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: '#111', lineHeight: 1.35 }}>
            {verb}{' '}
            <strong style={{ fontWeight: 500 }}>
              {match.opponent_name ?? 'Unknown'}
            </strong>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#666',
              marginTop: 3,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 7,
            }}
          >
            {match.opponent_utr_at_time != null ? (
              <span
                style={{
                  fontFamily: '"Helvetica Neue", Arial, sans-serif',
                  fontWeight: 500,
                  color: '#111',
                }}
              >
                UTR {match.opponent_utr_at_time.toFixed(1)}
              </span>
            ) : null}
            {divisionLabel ? (
              <>
                {match.opponent_utr_at_time != null ? (
                  <span style={{ color: '#D0D0D0', fontSize: 8 }}>●</span>
                ) : null}
                <span
                  style={{
                    ...divisionStyle,
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '1px 6px',
                    borderRadius: 3,
                    letterSpacing: 0.3,
                  }}
                >
                  {divisionLabel}
                </span>
              </>
            ) : null}
            {levelLabel ? (
              <>
                <span style={{ color: '#D0D0D0', fontSize: 8 }}>●</span>
                <span
                  style={{
                    ...levelStyle,
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '1px 6px',
                    borderRadius: 3,
                    letterSpacing: 0.3,
                  }}
                >
                  {levelLabel}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 5,
            flexShrink: 0,
            paddingTop: 2,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#888',
              fontFamily: '"Helvetica Neue", Arial, sans-serif',
              letterSpacing: 0.2,
            }}
          >
            {formatMatchDate(match.match_date)}
          </span>
          <ChevronDown
            size={11}
            color={isExpanded ? '#0F6E56' : '#888'}
            style={{
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {isExpanded ? (
        <div
          style={{
            padding: '4px 0 16px 58px',
            background: 'rgba(15,110,86,0.025)',
            fontSize: 13,
            color: '#444',
            lineHeight: 1.6,
            borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
          }}
        >
          {match.event_name ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#888', minWidth: 64, fontSize: 12 }}>
                Event
              </span>
              <span style={{ fontSize: 13 }}>{match.event_name}</span>
            </div>
          ) : null}
          {match.event_location ? (
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: match.event_name ? 4 : 0,
              }}
            >
              <span style={{ color: '#888', minWidth: 64, fontSize: 12 }}>
                Location
              </span>
              <span style={{ fontSize: 13 }}>{match.event_location}</span>
            </div>
          ) : null}
          {!match.event_name && !match.event_location ? (
            <div
              style={{ color: '#888', fontStyle: 'italic', fontSize: 12 }}
            >
              No additional details available.
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function emptyCopyForVariant(v: Variant): string {
  if (v === 'quality') {
    return 'No quality wins yet — wins vs same-or-higher UTR opponents will appear here.'
  }
  if (v === 'other') {
    return 'No wins below your UTR level in the last 12 months.'
  }
  return 'No losses in the last 12 months.'
}

function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            height: 48,
            background: '#F5F4F0',
            borderRadius: 8,
            animation: 'exposureMatchPulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '24px 20px',
        textAlign: 'center',
        fontSize: 13,
        color: '#888',
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
      }}
    >
      No matches synced in the last 12 months. Match history appears here as you
      play.
    </div>
  )
}
