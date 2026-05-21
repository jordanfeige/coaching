'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Send } from 'lucide-react'
import ViaBlob from '@/components/ViaBlob'
import { useViaContext } from '@/components/via/UniversalViaContext'
import { brand, fonts } from '@/lib/brand'

interface Props {
  placeholder?: string
  kicker?: string
}

const PAGE_KICKERS: Record<string, string> = {
  '/player/journey': 'your journey',
  '/player/training': 'your training',
  '/player/reels': 'your reels',
  '/player/coach': 'your coach',
  '/player/training#drills': 'your drills',
}

export default function UniversalViaBar({
  placeholder = 'Ask Via anything...',
  kicker,
}: Props) {
  const pathname = usePathname()
  const { prefilledPrompt, askVia } = useViaContext()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const viaKicker =
    kicker ??
    PAGE_KICKERS[pathname ?? ''] ??
    'your progress'

  useEffect(() => {
    if (prefilledPrompt) {
      setQuery(prefilledPrompt)
    }
  }, [prefilledPrompt])

  function handleSubmit() {
    const trimmed = query.trim()
    if (!trimmed) return
    askVia({ prompt: trimmed, context: pathname ?? 'player' })
    setQuery(trimmed)
  }

  return (
    <div
      id="universal-via-bar"
      style={{
        background: 'white',
        border: `1px solid ${focused ? brand.tealHex : brand.line}`,
        borderRadius: 18,
        padding: '10px 14px 10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 24,
        boxShadow: focused
          ? '0 6px 24px -10px rgba(45,155,127,0.25), 0 0 0 4px rgba(45,155,127,0.08)'
          : '0 2px 12px -6px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
      }}
    >
      <ViaBlob size={42} thinking={false} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.serif,
            fontSize: 11,
            fontStyle: 'italic',
            color: brand.sub,
            marginBottom: 2,
            letterSpacing: '0.01em',
          }}
        >
          Ask{' '}
          <span
            style={{
              color: brand.tealDarkHex,
              fontWeight: 700,
              fontStyle: 'normal',
            }}
          >
            via
          </span>{' '}
          about {viaKicker}
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={placeholder}
          aria-label="Ask Via"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: fonts.sans,
            fontSize: 14,
            color: brand.ink,
            padding: 0,
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!query.trim()}
        aria-label="Send to Via"
        style={{
          width: 36,
          height: 36,
          background: query.trim() ? brand.tealDarkHex : 'transparent',
          border: query.trim() ? 'none' : `1px solid ${brand.line}`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: query.trim() ? 'pointer' : 'default',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        <Send
          size={15}
          color={query.trim() ? 'white' : brand.muted}
          strokeWidth={2}
        />
      </button>
    </div>
  )
}
