'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { brand } from '@/lib/brand'
import {
  formatDurationLong,
  formatMatchDate,
} from '@/lib/film-room/format'
import type { FilmRoomMatchSummary } from '@/lib/film-room/types'
import {
  isMatchStillProcessing,
  matchProcessingPillLabel,
} from '@/lib/film-room/upload-progress'
import { useFilmRoomMatchRealtime } from '@/lib/film-room/use-film-room-match-realtime'
import { createClient } from '@/lib/supabase'

const BORDER = brand.border

function statusPill(match: FilmRoomMatchSummary) {
  const { status, analyzed_count, chunk_count } = match

  if (status === 'failed') {
    return { label: 'Failed', bg: '#FBEAF0', color: '#993556' }
  }
  if (isMatchStillProcessing(status)) {
    return {
      label: matchProcessingPillLabel(status),
      bg: brand.warmTint,
      color: brand.warm,
    }
  }
  if (status === 'ready') {
    if (analyzed_count === 0) {
      return { label: 'Ready to analyze', bg: brand.tealTint, color: brand.tealDarkHex }
    }
    return {
      label: analyzed_count >= 2 ? 'Coach take ready' : `${analyzed_count} of ${chunk_count} analyzed`,
      bg: brand.tealTint,
      color: brand.tealDarkHex,
    }
  }
  return { label: status, bg: brand.lineSoft, color: brand.sub }
}

function cardSubtitle(match: FilmRoomMatchSummary): string {
  if (isMatchStillProcessing(match.status)) {
    return 'Tap to see progress — you can leave and come back'
  }
  if (match.status === 'failed') {
    return match.status_error || 'Processing failed'
  }
  if (match.status === 'ready' && match.analyzed_count === 0) {
    return 'Analyze your first segment'
  }
  if (match.status === 'ready' && match.analyzed_count < 2) {
    return 'One more segment unlocks your coach take'
  }
  const duration = formatDurationLong(match.raw_video_duration_seconds)
  const bits = [duration]
  if (match.chunk_count > 0) bits.push(`${match.chunk_count} segments`)
  return bits.filter(Boolean).join(' · ')
}

function matchHref(match: FilmRoomMatchSummary): string {
  if (isMatchStillProcessing(match.status) || match.status === 'failed') {
    return `/player/reels/match/new?matchId=${match.id}`
  }
  return `/player/reels/match/${match.id}`
}

function MatchCard({
  match,
  onDelete,
}: {
  match: FilmRoomMatchSummary
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const pill = statusPill(match)
  const title = match.opponent_name
    ? `vs ${match.opponent_name}`
    : 'Untitled match'
  const dateLabel = formatMatchDate(match.match_date, match.created_at)
  const href = matchHref(match)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (
      !window.confirm(
        'Delete this match from Match Film? This cannot be undone.',
      )
    ) {
      return
    }
    onDelete(match.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          router.push(href)
        }
      }}
      style={{
        background: brand.card,
        border: `0.5px solid ${BORDER}`,
        borderRadius: 14,
        cursor: 'pointer',
        display: 'flex',
        transition: 'border-color 0.15s',
      }}
    >
      <div
        style={{
          width: 100,
          height: 80,
          flexShrink: 0,
          background: brand.tealDeep,
          position: 'relative',
          overflow: 'hidden',
          borderRight: `0.5px solid ${BORDER}`,
        }}
      >
        {match.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.thumbnail_url}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {isMatchStillProcessing(match.status) ? '…' : '—'}
          </div>
        )}
        {match.raw_video_duration_seconds != null && (
          <span
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              fontSize: 9,
              color: 'white',
              background: 'rgba(0,0,0,0.55)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            {formatDurationLong(match.raw_video_duration_seconds)}
          </span>
        )}
      </div>
      <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: brand.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
            {dateLabel ? ` · ${dateLabel}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 99,
                background: pill.bg,
                color: pill.color,
              }}
            >
              {pill.label}
            </span>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete match"
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: brand.muted,
                display: 'flex',
              }}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: brand.muted, lineHeight: 1.4 }}>
          {cardSubtitle(match)}
        </div>
      </div>
    </div>
  )
}

export function MatchFilmTab() {
  const [matches, setMatches] = useState<FilmRoomMatchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)

  const loadMatches = useCallback(() => {
    setLoading(true)
    fetch('/api/film-room/matches')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setMatches(data.matches ?? [])
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Failed to load matches')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('player_id')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.player_id) setPlayerId(profile.player_id)
    })
  }, [])

  const onRealtimeUpdate = useCallback(() => {
    loadMatches()
  }, [loadMatches])

  useFilmRoomMatchRealtime(playerId, onRealtimeUpdate)

  async function deleteMatch(matchId: string) {
    setError(null)
    const res = await fetch(`/api/film-room/match/${matchId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Delete failed')
      return
    }
    setMatches(prev => prev.filter(m => m.id !== matchId))
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 14,
        }}
      >
        <Link
          href="/player/reels/match/new"
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: 99,
            background: brand.tealDarkHex,
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          Upload match
        </Link>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: brand.muted }}>Loading matches…</p>
      )}
      {error && (
        <p style={{ fontSize: 13, color: brand.red }}>{error}</p>
      )}

      {!loading && !error && matches.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 24px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #eaf7f2, #eff3fe)',
            border: `0.5px solid ${BORDER}`,
          }}
        >
          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 20,
              fontWeight: 500,
              margin: '0 0 10px',
              color: brand.ink,
            }}
          >
            No match film yet
          </h2>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              color: brand.sub,
              lineHeight: 1.55,
              margin: '0 0 20px',
            }}
          >
            Upload a full match video and we&apos;ll break it into segments so you can
            analyze the moments that matter.
          </p>
          <Link
            href="/player/reels/match/new"
            style={{
              display: 'inline-block',
              fontSize: 13,
              fontWeight: 600,
              padding: '10px 20px',
              borderRadius: 99,
              background: brand.tealDarkHex,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            Upload match
          </Link>
        </div>
      )}

      {!loading && matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {matches.map(m => (
            <MatchCard key={m.id} match={m} onDelete={deleteMatch} />
          ))}
        </div>
      )}
    </div>
  )
}
