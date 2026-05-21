'use client'

import { useEffect, useState } from 'react'
import type { PlayerQuest, PlayerQuestsPayload } from '@/lib/player-training-quests'

function QuestRow({ quest, isFirst }: { quest: PlayerQuest; isFirst: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 0',
        borderTop: isFirst ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: quest.done ? 'none' : '1.5px solid rgba(0,0,0,0.2)',
          background: quest.done ? '#0F6E56' : 'transparent',
          flexShrink: 0,
          marginTop: 2,
          position: 'relative',
        }}
        aria-hidden
      >
        {quest.done && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              left: 6,
              width: 4,
              height: 7,
              borderRight: '1.5px solid white',
              borderBottom: '1.5px solid white',
              transform: 'rotate(45deg)',
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: quest.done ? '#888' : '#111',
            fontWeight: 500,
            textDecoration: quest.done ? 'line-through' : 'none',
            marginBottom: 3,
          }}
        >
          {quest.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span>{quest.payoff}</span>
          <span
            style={{
              width: 3,
              height: 3,
              background: '#D0D0D0',
              borderRadius: '50%',
            }}
          />
          <span>{quest.status_label}</span>
        </div>
      </div>

      {!quest.done && quest.target > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            paddingTop: 2,
          }}
        >
          <div
            style={{
              width: 50,
              height: 4,
              background: 'rgba(0,0,0,0.08)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(quest.progress / quest.target) * 100}%`,
                background: '#0F6E56',
                borderRadius: 99,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#888',
              fontFamily: 'Helvetica Neue, sans-serif',
              fontWeight: 500,
              minWidth: 32,
              textAlign: 'right',
            }}
          >
            {quest.progress} / {quest.target}
          </div>
        </div>
      )}

      {!quest.done && quest.target === 1 && (
        <div
          style={{
            fontSize: 10,
            color: '#888',
            fontFamily: 'Helvetica Neue, sans-serif',
            fontWeight: 500,
            flexShrink: 0,
            paddingTop: 2,
          }}
        >
          {quest.progress} / {quest.target}
        </div>
      )}
    </div>
  )
}

type QuestsCardProps = {
  onReadyChange?: (ready: boolean) => void
}

export function QuestsCard({ onReadyChange }: QuestsCardProps) {
  const [data, setData] = useState<PlayerQuestsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/player/quests')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: PlayerQuestsPayload) => setData(d))
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
          height: 200,
          background: '#F5F4F0',
          borderRadius: 14,
          marginBottom: 14,
        }}
        aria-busy
      />
    )
  }

  if (!data || data.quests.length === 0) {
    return (
      <div
        style={{
          background: 'white',
          borderRadius: 14,
          padding: '18px 20px',
          marginBottom: 14,
          border: '0.5px solid rgba(0,0,0,0.06)',
        }}
      >
        <h2
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 16,
            fontWeight: 500,
            margin: '0 0 8px',
          }}
        >
          This week&apos;s quests
        </h2>
        <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.5 }}>
          Complete drills and log a reel to start tracking weekly goals.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 14,
        border: '0.5px solid rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 12,
        }}
      >
        <h2
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 16,
            fontWeight: 500,
            margin: 0,
          }}
        >
          This week&apos;s quests
        </h2>
        <div style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>
          Week of {data.weekOf}
        </div>
      </div>

      {data.quests.map((quest, i) => (
        <QuestRow key={quest.id} quest={quest} isFirst={i === 0} />
      ))}
    </div>
  )
}
