'use client'

import { useState, type ReactNode } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import ViaBlob from '@/components/ViaBlob'
import { useViaContext } from '@/components/via/UniversalViaContext'
import {
  INK,
  LINE,
  MUTED,
  TEAL,
  TEAL_DARK,
  TEAL_GLAZE,
  TEAL_TINT,
  sans,
  serif,
} from '@/lib/player-home-tokens'

type Props = {
  playerName: string
  welcomeMessage: ReactNode
  prompts: string[]
  onAsk?: () => void
}

export default function PlayerHomeViaHero({
  playerName,
  welcomeMessage,
  prompts,
  onAsk,
}: Props) {
  const { askVia } = useViaContext()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    askVia({ prompt: trimmed, context: 'player-home' })
    onAsk?.()
    setQuery('')
  }

  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${TEAL_GLAZE} 0%, #FAFAF7 100%)`,
        border: `1px solid ${TEAL_TINT}`,
        borderRadius: 20,
        padding: '28px 30px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(125,221,184,0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 18,
          marginBottom: 18,
        }}
      >
        <ViaBlob size={48} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: serif,
                fontSize: 22,
                fontWeight: 700,
                fontStyle: 'italic',
                color: TEAL_DARK,
                letterSpacing: '-0.2px',
              }}
            >
              Via
            </span>
            <span
              style={{
                fontFamily: sans,
                fontSize: 11,
                color: MUTED,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              · your assistant
            </span>
          </div>
          <div
            style={{
              fontFamily: serif,
              fontSize: 18,
              fontWeight: 400,
              color: INK,
              lineHeight: 1.4,
              letterSpacing: '-0.2px',
            }}
          >
            {welcomeMessage ?? (
              <>
                Welcome back, {playerName}. Ask Via anything about your training.
              </>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 18,
          position: 'relative',
        }}
      >
        {prompts.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => submit(p)}
            style={{
              padding: '8px 14px',
              background: 'white',
              border: `1px solid ${LINE}`,
              borderRadius: 999,
              fontFamily: sans,
              fontSize: 12.5,
              fontWeight: 600,
              color: TEAL_DARK,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <HelpCircle size={12} strokeWidth={2} />
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          submit(query)
        }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'white',
          border: `1px solid ${focused ? TEAL : LINE}`,
          borderRadius: 14,
          padding: '10px 10px 10px 16px',
          boxShadow: focused
            ? '0 6px 20px -8px rgba(45,155,127,0.25), 0 0 0 4px rgba(45,155,127,0.08)'
            : '0 2px 8px -4px rgba(0,0,0,0.04)',
          transition: 'all 0.2s',
        }}
      >
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask Via anything..."
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: sans,
            fontSize: 14,
            color: INK,
          }}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          aria-label="Send to Via"
          style={{
            width: 36,
            height: 36,
            background: query.trim() ? TEAL_DARK : TEAL_TINT,
            border: 'none',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: query.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          <Send
            size={14}
            color={query.trim() ? 'white' : TEAL_DARK}
            strokeWidth={2}
          />
        </button>
      </form>
    </section>
  )
}
