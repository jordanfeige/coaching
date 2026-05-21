'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import type { PracticeStreakPayload } from '@/lib/player-practice-streak'

type StreakCardProps = {
  onReadyChange?: (ready: boolean) => void
}

export function StreakCard({ onReadyChange }: StreakCardProps) {
  const [data, setData] = useState<PracticeStreakPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/player/streak')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: PracticeStreakPayload) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    onReadyChange?.(!loading)
  }, [loading, onReadyChange])

  if (loading) {
    return (
      <div
        style={{
          height: 72,
          background: '#F5F4F0',
          borderRadius: 14,
        }}
        aria-busy
      />
    )
  }

  if (!data) return null

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 14,
        padding: '14px 20px',
        border: '0.5px solid rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: '#FAEEDA',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#BA7517',
          flexShrink: 0,
        }}
      >
        <Flame size={20} aria-hidden />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#111' }}>
          <strong style={{ fontWeight: 500, color: '#854F0B' }}>
            {data.weekStreak}-week practice streak
          </strong>{' '}
          · {data.totalSessions} sessions logged
        </div>
        {data.needsForThisWeek > 0 && (
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            Log 1 more session this week to extend it
          </div>
        )}
      </div>

      {data.needsForThisWeek > 0 && (
        <Link
          href="/player/training/drills"
          style={{
            fontSize: 11,
            color: '#0F6E56',
            fontWeight: 500,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          Log session →
        </Link>
      )}
    </div>
  )
}
