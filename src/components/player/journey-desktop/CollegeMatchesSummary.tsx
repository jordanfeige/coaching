'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import AskViaAnchor from '@/components/player/AskViaAnchor'
import { brand, fonts } from '@/lib/brand'
import {
  BUCKET_STYLES,
  SAVED_FILTER_STYLE,
  formatDivision,
  type CollegeMatchDrawerTab,
  type CollegeMatchRow,
} from '@/lib/college-matching-ui'
import type { MatchBucket } from '@/lib/college-matching'

type Props = {
  summary: { total: number; likely: number; target: number; reach: number }
  savedCount: number
  topMatches: CollegeMatchRow[]
  wizardComplete: boolean
  onOpenDrawer: (tab?: CollegeMatchDrawerTab) => void
}

function FilterPill({
  label,
  count,
  colors,
  onClick,
}: {
  label: string
  count: number
  colors: { bg: string; border: string; text: string }
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        fontFamily: fonts.sans,
        fontSize: 12,
        fontWeight: 700,
        color: colors.text,
        cursor: 'pointer',
      }}
    >
      {label} · {count}
    </button>
  )
}

function tennisProgram(row: CollegeMatchRow) {
  const tp = row.schools.school_tennis_programs
  return Array.isArray(tp) ? tp[0] : tp
}

export default function CollegeMatchesSummary({
  summary,
  savedCount,
  topMatches,
  wizardComplete,
  onOpenDrawer,
}: Props) {
  if (!wizardComplete) {
    return (
      <section style={{ marginTop: 28 }}>
        <div
          style={{
            background: brand.paper,
            border: `1px solid ${brand.line}`,
            borderRadius: 16,
            padding: '20px 22px',
          }}
        >
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: brand.sub,
              marginBottom: 8,
            }}
          >
            Your college matches
          </div>
          <p
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: brand.sub,
              lineHeight: 1.55,
              margin: '0 0 14px',
            }}
          >
            Complete your Journey profile to see matching schools.
          </p>
          <Link
            href="/onboarding/journey/utr"
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              fontWeight: 700,
              color: brand.tealDarkHex,
            }}
          >
            Continue Journey setup →
          </Link>
        </div>
      </section>
    )
  }

  if (summary.total === 0) {
    return (
      <section style={{ marginTop: 28 }}>
        <div
          style={{
            background: brand.paper,
            border: `1px solid ${brand.line}`,
            borderRadius: 16,
            padding: '20px 22px',
          }}
        >
          <p style={{ fontFamily: fonts.sans, fontSize: 14, color: brand.sub, margin: 0 }}>
            Add UTR and academics to your Journey to generate college matches.
          </p>
        </div>
      </section>
    )
  }

  const buckets: { key: MatchBucket; count: number }[] = [
    { key: 'likely', count: summary.likely },
    { key: 'target', count: summary.target },
    { key: 'reach', count: summary.reach },
  ]

  return (
    <section style={{ marginTop: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14,
        }}
      >
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
        <button
          type="button"
          onClick={() => onOpenDrawer('all')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            fontFamily: fonts.sans,
            fontSize: 13,
            fontWeight: 700,
            color: brand.tealDarkHex,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          See all matches
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {buckets.map(b => {
          const s = BUCKET_STYLES[b.key]
          return (
            <FilterPill
              key={b.key}
              label={s.label}
              count={b.count}
              colors={s}
              onClick={() => onOpenDrawer(b.key)}
            />
          )
        })}
        <FilterPill
          label={SAVED_FILTER_STYLE.label}
          count={savedCount}
          colors={SAVED_FILTER_STYLE}
          onClick={() => onOpenDrawer('saved')}
        />
        <AskViaAnchor
          prompt="Why am I a Reach at most D1 schools?"
          label="Why Reach at D1?"
          context="college-matches-summary"
        />
      </div>

      <div
        style={{
          background: 'white',
          border: `1px solid ${brand.line}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {topMatches.map((row, i) => {
          const s = BUCKET_STYLES[row.bucket]
          const tp = tennisProgram(row)
          const loc = [row.schools.city, row.schools.state]
            .filter(Boolean)
            .join(', ')
          return (
            <button
              key={row.schools.ipeds_id}
              type="button"
              onClick={() => onOpenDrawer(row.bucket)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'stretch',
                gap: 0,
                border: 'none',
                borderBottom:
                  i < topMatches.length - 1 ? `1px solid ${brand.lineSoft}` : 'none',
                background: 'white',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
              }}
            >
              <div style={{ width: 4, background: s.bar, flexShrink: 0 }} />
              <div
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: brand.ink,
                    }}
                  >
                    {row.schools.name}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 11,
                      color: brand.sub,
                      marginTop: 2,
                    }}
                  >
                    {loc}
                    {tp?.division ? ` · ${formatDivision(tp.division)}` : ''}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: s.bg,
                    color: s.text,
                    flexShrink: 0,
                  }}
                >
                  {s.label}
                </span>
              </div>
              <ChevronRight
                size={16}
                style={{ alignSelf: 'center', marginRight: 12, color: brand.muted }}
              />
            </button>
          )
        })}
      </div>

      <p
        style={{
          fontFamily: fonts.sans,
          fontSize: 11,
          color: brand.muted,
          lineHeight: 1.5,
          margin: '10px 0 0',
        }}
      >
        Roster data via UTR · Admissions via College Scorecard · Actual
        recruitment depends on coach interest and position need.
      </p>
    </section>
  )
}
