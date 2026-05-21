'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Camera,
  Lightbulb,
  Play,
  Sparkles,
  Target,
  Upload,
} from 'lucide-react'
import { usePageReady } from '@/contexts/PageLoadingContext'
import { setPendingReelVideoFile } from '@/lib/pending-reel'
import { ReelsRecordModal } from '@/components/player/reels/ReelsRecordModal'

export type ReelSummary = {
  id: string
  analyzedAt: string
  score: number | null
  title: string
  shotType: string | null
  topIssue: string | null
  issueCount: number
  durationSeconds: number | null
}

type Stats = {
  totalCount: number
  thisMonthCount: number
  scoreTrend: number | null
  avgLastFourScore: number
  topIssue: { name: string; appearancesIn: number; outOf: number } | null
}

type Insight = {
  hasInsight: boolean
  title?: string
  headline?: string
  body?: string
  suggestedDrill?: string | null
  message?: string
}

type Props = {
  recentReels: ReelSummary[]
  hasAnyReels: boolean
}

export function ReelsLandingClient({ recentReels, hasAnyReels }: Props) {
  const [recordOpen, setRecordOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [statsLoaded, setStatsLoaded] = useState(!hasAnyReels)

  useEffect(() => {
    if (!hasAnyReels) return
    Promise.all([
      fetch('/api/player/reels/stats').then(r => r.json()),
      fetch('/api/player/reels/insight').then(r => r.json()),
    ])
      .then(([s, i]) => {
        setStats(s as Stats)
        setInsight(i as Insight)
      })
      .catch(() => {})
      .finally(() => setStatsLoaded(true))
  }, [hasAnyReels])

  usePageReady(statsLoaded)

  if (!hasAnyReels) {
    return (
      <>
        <EmptyState onRecord={() => setRecordOpen(true)} />
        {recordOpen && (
          <ReelsRecordModal onClose={() => setRecordOpen(false)} />
        )}
      </>
    )
  }

  return (
    <div
      style={{
        padding: '14px 16px 48px',
        maxWidth: 880,
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 24,
            fontWeight: 500,
            margin: 0,
            color: '#111',
          }}
        >
          Reels
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <UploadButton />
          <button
            type="button"
            onClick={() => setRecordOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: 99,
              cursor: 'pointer',
              background: '#0F6E56',
              color: 'white',
              border: '0.5px solid #0F6E56',
            }}
          >
            <Camera size={14} aria-hidden />
            Record
          </button>
        </div>
      </header>

      {stats && (
        <div
          className="reels-stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <StatCard
            label="Reels analyzed"
            value={`${stats.totalCount}`}
            delta={
              stats.thisMonthCount > 0
                ? `+${stats.thisMonthCount} this month`
                : null
            }
          />
          <StatCard
            label="Avg score trend"
            value={
              stats.scoreTrend != null
                ? `${stats.scoreTrend > 0 ? '↑' : stats.scoreTrend < 0 ? '↓' : '→'} ${Math.abs(stats.scoreTrend)}`
                : '—'
            }
            valueColor={
              stats.scoreTrend != null && stats.scoreTrend > 0
                ? '#0F6E56'
                : stats.scoreTrend != null && stats.scoreTrend < 0
                  ? '#854F0B'
                  : '#111'
            }
            delta="last 4 reels"
          />
          <StatCard
            label="Top recurring issue"
            value={stats.topIssue ? stats.topIssue.name : '—'}
            valueSize="small"
            valueColor="#854F0B"
            valueItalic
          />
        </div>
      )}

      {insight?.hasInsight && (
        <div
          style={{
            background: 'white',
            border: '0.5px solid rgba(15,110,86,0.3)',
            borderLeft: '3px solid #0F6E56',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: '#0F6E56',
                background: '#E1F5EE',
                padding: '3px 8px',
                borderRadius: 99,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Sparkles size={11} aria-hidden />
              This week&apos;s insight
            </span>
            {insight.title && (
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#111',
                }}
              >
                {insight.title}
              </span>
            )}
          </div>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: 13,
              color: '#444',
              lineHeight: 1.5,
              margin: '0 0 10px',
            }}
          >
            {insight.body}
          </p>
          {insight.suggestedDrill && (
            <Link
              href="/player/training"
              style={{
                fontSize: 11,
                color: '#0F6E56',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
              }}
            >
              <Target size={11} aria-hidden />
              View drill in Training →
            </Link>
          )}
        </div>
      )}

      <section style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#888',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Recent reels</span>
          {stats && stats.totalCount > 3 && (
            <Link
              href="/player/reels/all"
              style={{
                fontSize: 11,
                color: '#0F6E56',
                fontWeight: 600,
                textTransform: 'none',
                letterSpacing: 0,
                textDecoration: 'none',
              }}
            >
              See all {stats.totalCount} →
            </Link>
          )}
        </div>

        <div
          className="reels-recent-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {recentReels.slice(0, 3).map(reel => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => setRecordOpen(true)}
        style={{
          width: '100%',
          background: 'rgba(15,110,86,0.04)',
          border: '1px dashed rgba(15,110,86,0.3)',
          borderRadius: 12,
          padding: 18,
          textAlign: 'center',
          cursor: 'pointer',
          marginTop: 6,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: '#0F6E56',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto 10px',
          }}
        >
          <Camera size={18} aria-hidden />
        </div>
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            fontWeight: 500,
            color: '#111',
            marginBottom: 4,
          }}
        >
          Log a reel this week to climb your score
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#666',
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
          }}
        >
          Quick 20–30 second clips work best · AI analyzes within 60 seconds
        </div>
      </button>

      {recordOpen && <ReelsRecordModal onClose={() => setRecordOpen(false)} />}

      <style>{`
        @media (max-width: 640px) {
          .reels-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .reels-recent-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}

function StatCard({
  label,
  value,
  valueColor,
  valueSize,
  valueItalic,
  delta,
}: {
  label: string
  value: string
  valueColor?: string
  valueSize?: 'small'
  valueItalic?: boolean
  delta?: string | null
}) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 10,
        padding: '12px 14px',
        border: '0.5px solid rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: '#888',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: valueSize === 'small' ? 14 : 22,
            fontWeight: 500,
            color: valueColor || '#111',
            lineHeight: 1.1,
            fontStyle: valueItalic ? 'italic' : 'normal',
          }}
        >
          {value}
        </span>
        {delta && (
          <span style={{ fontSize: 10, color: '#0F6E56', fontWeight: 600 }}>
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}

function ReelCard({ reel }: { reel: ReelSummary }) {
  return (
    <Link
      href={`/player/reels/${reel.id}`}
      style={{
        background: 'white',
        borderRadius: 10,
        border: '0.5px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      <div
        style={{
          aspectRatio: '16 / 10',
          background: '#0A2A22',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Play
          size={28}
          color="rgba(255,255,255,0.45)"
          fill="rgba(255,255,255,0.2)"
          aria-hidden
        />
        {reel.score != null && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              fontSize: 9,
              fontWeight: 600,
              color: 'white',
              background: 'rgba(0,0,0,0.55)',
              padding: '2px 7px',
              borderRadius: 99,
            }}
          >
            {reel.score}
          </span>
        )}
        {reel.durationSeconds != null && (
          <span
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              fontSize: 9,
              color: 'white',
              background: 'rgba(0,0,0,0.55)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            {formatDuration(reel.durationSeconds)}
          </span>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#111',
            marginBottom: 3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {reel.title}
          {reel.topIssue ? ` · ${reel.topIssue}` : ''}
        </div>
        <div style={{ fontSize: 10, color: '#888' }}>
          {timeAgo(reel.analyzedAt)} · {reel.issueCount} issue
          {reel.issueCount !== 1 ? 's' : ''}
        </div>
      </div>
    </Link>
  )
}

function UploadButton() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          padding: '8px 14px',
          borderRadius: 99,
          cursor: 'pointer',
          background: 'white',
          color: '#444',
          border: '0.5px solid rgba(0,0,0,0.12)',
        }}
      >
        <Upload size={14} aria-hidden />
        Upload
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          setPendingReelVideoFile(file)
          router.push('/player/reels/new')
          e.target.value = ''
        }}
      />
    </>
  )
}

function EmptyState({ onRecord }: { onRecord: () => void }) {
  return (
    <div
      style={{
        padding: '56px 24px 48px',
        maxWidth: 520,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          background: '#0F6E56',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          margin: '0 auto 18px',
        }}
      >
        <Camera size={28} aria-hidden />
      </div>

      <h1
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 28,
          fontWeight: 500,
          color: '#111',
          margin: '0 0 10px',
        }}
      >
        Log your first reel
      </h1>

      <p
        style={{
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: 14,
          color: '#666',
          lineHeight: 1.55,
          margin: '0 0 24px',
        }}
      >
        Record a 20–30 second clip of your forehand, backhand, or serve. AI
        analyzes your technique in under a minute and tells you exactly what to
        work on.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={onRecord}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            padding: '10px 18px',
            borderRadius: 99,
            cursor: 'pointer',
            background: '#0F6E56',
            color: 'white',
            border: 'none',
          }}
        >
          <Camera size={15} aria-hidden />
          Record now
        </button>
        <UploadButton />
      </div>

      <p
        style={{
          marginTop: 28,
          fontSize: 12,
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Lightbulb size={14} color="#0F6E56" aria-hidden />
        Side-on camera angle works best for technique analysis
      </p>
    </div>
  )
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 14) return 'Last week'
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
