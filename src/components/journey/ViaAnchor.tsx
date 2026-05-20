'use client'

import { useViaContext } from '@/components/via/UniversalViaContext'
import { TOKENS, FONTS } from './JourneyTokens'

interface ViaAnchorProps {
  prompt: string
  context: string
  color?: string
  onDark?: boolean
}

export function ViaAnchor({
  prompt,
  context,
  color = TOKENS.TEAL_DARK,
  onDark = false,
}: ViaAnchorProps) {
  const { askVia } = useViaContext()

  return (
    <button
      type="button"
      onClick={() => askVia({ prompt, context })}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 11px',
        background: onDark ? 'rgba(255,255,255,0.08)' : 'white',
        border: onDark ? '1px solid rgba(255,255,255,0.18)' : `1px solid ${TOKENS.LINE}`,
        borderRadius: 999,
        fontFamily: FONTS.sans,
        fontSize: 11.5,
        fontWeight: 600,
        color: onDark ? 'rgba(255,255,255,0.95)' : color,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <circle
          cx="6"
          cy="6"
          r="5.5"
          stroke={onDark ? 'rgba(255,255,255,0.95)' : color}
          strokeWidth="1.2"
          fill="none"
        />
        <circle
          cx="6"
          cy="6"
          r="1.5"
          fill={onDark ? 'rgba(255,255,255,0.95)' : color}
        />
      </svg>
      {prompt}
    </button>
  )
}
