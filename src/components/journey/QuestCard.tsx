'use client'

import { useState } from 'react'
import type { JourneyQuest } from '@/lib/journey-types'
import { ViaAnchor } from './ViaAnchor'
import { Bar } from './Bar'
import { DifficultyMeter } from './DifficultyMeter'
import { TOKENS, FONTS, SEVERITY_COLORS, CATEGORY_COLORS } from './JourneyTokens'

type Props = {
  quest: JourneyQuest
}

export function QuestCard({ quest }: Props) {
  const [whyOpen, setWhyOpen] = useState(false)
  const sev = SEVERITY_COLORS[quest.severity]
  const catColor = CATEGORY_COLORS[quest.affectsKey]

  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${TOKENS.LINE}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: 6,
              background: sev.tint,
              color: sev.color,
            }}
          >
            {sev.label}
          </span>
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 12,
              fontWeight: 700,
              color: TOKENS.TEAL_DARK,
            }}
          >
            +{quest.reward} pts
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{quest.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                fontFamily: FONTS.serif,
                fontSize: 16,
                fontWeight: 700,
                color: TOKENS.INK,
                margin: '0 0 6px',
                letterSpacing: '-0.2px',
              }}
            >
              {quest.title}
            </h4>
            <p
              style={{
                fontFamily: FONTS.sans,
                fontSize: 12,
                color: TOKENS.SUB,
                margin: '0 0 10px',
                lineHeight: 1.5,
              }}
            >
              {quest.desc}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: quest.progress > 0 ? 10 : 0,
              }}
            >
              <DifficultyMeter level={quest.difficulty} />
              <span
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  color: TOKENS.MUTED,
                }}
              >
                ⏱ {quest.timeWindow}
              </span>
            </div>
            {quest.progress > 0 && (
              <div style={{ marginBottom: 8 }}>
                <Bar value={quest.progress} color={TOKENS.TEAL} />
                <div
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 10,
                    color: TOKENS.MUTED,
                    marginTop: 4,
                  }}
                >
                  {Math.round(quest.progress * 100)}% complete
                </div>
              </div>
            )}
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: 10,
                fontWeight: 600,
                color: catColor?.color || TOKENS.SUB,
              }}
            >
              Affects {quest.affects}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setWhyOpen(v => !v)}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: `1px solid ${TOKENS.LINE}`,
            background: whyOpen ? TOKENS.LINE_SOFT : 'white',
            fontFamily: FONTS.sans,
            fontSize: 11,
            fontWeight: 600,
            color: TOKENS.SUB,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {whyOpen ? '▾' : '▸'} Why this matters
        </button>
        {whyOpen && (
          <p
            style={{
              fontFamily: FONTS.sans,
              fontSize: 12,
              color: TOKENS.INK,
              lineHeight: 1.55,
              margin: '10px 0 0',
              padding: '10px 12px',
              background: TOKENS.CREAM,
              borderRadius: 8,
              border: `1px solid ${TOKENS.LINE_SOFT}`,
            }}
          >
            {quest.probability}
          </p>
        )}
      </div>

      <div
        style={{
          borderTop: `1px dashed ${TOKENS.LINE}`,
          padding: '12px 16px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {quest.viaPrompts.map(p => (
          <ViaAnchor
            key={p}
            prompt={p}
            context={`quest:${quest.id}`}
            color={catColor?.color}
          />
        ))}
      </div>
    </div>
  )
}
