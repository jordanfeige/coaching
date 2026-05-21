'use client'

import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpRight,
  Trophy,
  TrendingUp,
  Upload,
  Video,
} from 'lucide-react'
import type { CategoryKey } from '@/lib/journey-types'

const NUDGE_ICONS: Record<string, LucideIcon> = {
  'arrow-up-right': ArrowUpRight,
  upload: Upload,
  'trending-up': TrendingUp,
  video: Video,
  trophy: Trophy,
}

export type SubScoreTileProps = {
  category: CategoryKey
  name: string
  icon: string
  weight: number
  scorePct: number
  scoreColor: string
  nudgeText: string
  nudgeIcon: keyof typeof NUDGE_ICONS | string
  nudgeIsWarn?: boolean
  onClick: () => void
}

export function SubScoreTile({
  name,
  icon,
  weight,
  scorePct,
  scoreColor,
  nudgeText,
  nudgeIcon,
  nudgeIsWarn = false,
  onClick,
}: SubScoreTileProps) {
  const NudgeIcon = NUDGE_ICONS[nudgeIcon] ?? ArrowUpRight

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 10,
        padding: '11px 11px',
        border: '0.5px solid rgba(0,0,0,0.06)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 150,
        height: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.015)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'white'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 14 }} aria-hidden>
          {icon}
        </span>
        <span
          style={{
            fontSize: 8,
            fontWeight: 500,
            color: '#999',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {weight}% weight
        </span>
      </div>

      <div
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 5,
        }}
      >
        {name}
      </div>

      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 22,
          fontWeight: 500,
          color: '#111',
          lineHeight: 1,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'baseline',
          gap: 2,
        }}
      >
        {scorePct}
        <span
          style={{
            fontSize: 11,
            color: '#888',
            fontFamily: 'Helvetica Neue, sans-serif',
            fontWeight: 400,
          }}
        >
          %
        </span>
      </div>

      <div
        style={{
          height: 3,
          background: 'rgba(0,0,0,0.06)',
          borderRadius: 99,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, scorePct))}%`,
            background: scoreColor,
            borderRadius: 99,
          }}
        />
      </div>

      <div
        style={{
          fontSize: 10,
          color: nudgeIsWarn ? '#854F0B' : '#0F6E56',
          fontWeight: 500,
          lineHeight: 1.4,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 4,
          marginTop: 'auto',
        }}
      >
        <NudgeIcon size={11} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
        <span>{nudgeText}</span>
      </div>
    </button>
  )
}
