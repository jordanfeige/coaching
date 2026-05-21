'use client'

import { HelpCircle } from 'lucide-react'
import { useAskVia } from '@/components/player/ask-via/AskViaContext'
import { brand, fonts } from '@/lib/brand'

interface Props {
  prompt: string
  label: string
  context?: string
  variant?: 'light' | 'dark'
}

export default function AskViaAnchor({
  prompt,
  label,
  context = '',
  variant = 'light',
}: Props) {
  const { askVia } = useAskVia()
  const isDark = variant === 'dark'

  return (
    <button
      type="button"
      onClick={() => askVia({ prompt, context })}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px 5px 9px',
        background: isDark ? 'rgba(255,255,255,0.1)' : brand.tealTint,
        border: isDark
          ? '1px solid rgba(255,255,255,0.18)'
          : `1px solid rgba(45,155,127,0.18)`,
        borderRadius: 999,
        fontFamily: fonts.sans,
        fontSize: 11.5,
        fontWeight: 600,
        color: isDark ? 'white' : brand.tealDarkHex,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <HelpCircle size={13} strokeWidth={2} />
      {label}
    </button>
  )
}
