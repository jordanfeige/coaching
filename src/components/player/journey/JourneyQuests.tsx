'use client'

import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { useAskVia } from '@/components/player/ask-via/AskViaContext'
import { playerJourneyMock } from '@/lib/player-journey-mock'
import type { JourneyQuest } from '@/lib/player-journey-mock'

const TEAL = '#2D9B7F'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'

type Props = {
  onScrollToVia?: () => void
}

function statusLabel(status: JourneyQuest['status']) {
  if (status === 'complete') return 'Done'
  if (status === 'active') return 'Active'
  return 'Locked'
}

export default function JourneyQuests({ onScrollToVia }: Props) {
  const { askVia } = useAskVia()
  const { quests } = playerJourneyMock

  function handleQuestAction(quest: JourneyQuest) {
    if (quest.status === 'locked') return
    if (quest.viaPrompt) {
      askVia({ prompt: quest.viaPrompt, context: `quest:${quest.id}` })
      onScrollToVia?.()
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: TEXT_MUTED,
          }}
        >
          Quests
        </div>
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>
          +{quests.filter(q => q.status === 'active').reduce((s, q) => s + q.points, 0)} pts available
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {quests.map(quest => {
          const locked = quest.status === 'locked'
          const done = quest.status === 'complete'
          const inner = (
            <div
              style={{
                background: 'white',
                border: `0.5px solid ${done ? 'rgba(45,155,127,.35)' : BORDER}`,
                borderRadius: 12,
                padding: '12px 14px',
                opacity: locked ? 0.65 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {locked ? (
                    <Lock size={14} color={TEXT_MUTED} />
                  ) : (
                    <Sparkles size={14} color={done ? TEAL : '#D97706'} />
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: TEXT,
                    }}
                  >
                    {quest.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: done ? TEAL : TEXT_MUTED,
                  }}
                >
                  {statusLabel(quest.status)} · {quest.points} pts
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: TEXT_MUTED,
                  margin: '0 0 8px',
                  lineHeight: 1.45,
                }}
              >
                {quest.description}
              </p>
              {!locked && !done && (quest.viaPrompt || quest.href) && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: TEAL,
                  }}
                >
                  {quest.href ? 'Open →' : 'Ask Via →'}
                </span>
              )}
            </div>
          )

          if (locked || done) {
            return <div key={quest.id}>{inner}</div>
          }

          if (quest.href) {
            return (
              <Link key={quest.id} href={quest.href} style={{ textDecoration: 'none' }}>
                {inner}
              </Link>
            )
          }

          return (
            <button
              key={quest.id}
              type="button"
              onClick={() => handleQuestAction(quest)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {inner}
            </button>
          )
        })}
      </div>
    </div>
  )
}
