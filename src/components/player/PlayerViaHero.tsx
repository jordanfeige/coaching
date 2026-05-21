'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import ViaBlob from '@/components/ViaBlob'
import UniversalVia, {
  type UniversalViaReelContext,
} from '@/components/UniversalVia'
import { useViaContextOptional } from '@/components/via/UniversalViaContext'
import type { PageContext } from '@/lib/via-page-brief'
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

export type PlayerViaHeroProps = {
  playerId: string
  playerName: string
  pageContext: PageContext
  welcomeMessage: ReactNode
  prompts: string[]
  reelContext?: UniversalViaReelContext
  /** When false, pills + input are disabled until player id is ready. */
  chatEnabled?: boolean
}

export default function PlayerViaHero({
  playerId,
  playerName,
  pageContext,
  welcomeMessage,
  prompts,
  reelContext,
  chatEnabled = true,
}: PlayerViaHeroProps) {
  const viaCtx = useViaContextOptional()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [autoSendPrompt, setAutoSendPrompt] = useState<string | null>(null)

  useEffect(() => {
    const prompt = viaCtx?.prefilledPrompt?.trim()
    if (!prompt || !chatEnabled) return
    setAutoSendPrompt(prompt)
    setChatOpen(true)
    setQuery('')
  }, [viaCtx?.prefilledPrompt, chatEnabled])

  function submit(text: string) {
    if (!chatEnabled || !playerId) return
    const trimmed = text.trim()
    if (!trimmed) return
    setAutoSendPrompt(trimmed)
    setChatOpen(true)
    setQuery('')
  }

  const sectionStyle = {
    background: `linear-gradient(135deg, ${TEAL_GLAZE} 0%, #FAFAF7 100%)`,
    border: `1px solid ${TEAL_TINT}`,
    borderRadius: 20,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    marginBottom: 24,
  }

  if (chatOpen && playerId) {
    return (
      <section
        style={{
          ...sectionStyle,
          padding: '20px 22px 18px',
        }}
      >
        <UniversalVia
          role="player"
          playerId={playerId}
          playerName={playerName}
          pageContext={pageContext}
          reelContext={reelContext}
          embedded
          embeddedInHero
          autoSendPrompt={autoSendPrompt ?? viaCtx?.prefilledPrompt}
        />
      </section>
    )
  }

  return (
    <section
      style={{
        ...sectionStyle,
        padding: '28px 30px 24px',
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
            {welcomeMessage}
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
            disabled={!chatEnabled || !playerId}
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
              cursor: chatEnabled && playerId ? 'pointer' : 'default',
              opacity: chatEnabled && playerId ? 1 : 0.6,
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
          disabled={!chatEnabled || !playerId}
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
          disabled={!chatEnabled || !playerId || !query.trim()}
          aria-label="Send to Via"
          style={{
            width: 36,
            height: 36,
            background: query.trim() && chatEnabled && playerId ? TEAL_DARK : TEAL_TINT,
            border: 'none',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: query.trim() && chatEnabled && playerId ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          <Send
            size={14}
            color={query.trim() && chatEnabled && playerId ? 'white' : TEAL_DARK}
            strokeWidth={2}
          />
        </button>
      </form>
    </section>
  )
}
