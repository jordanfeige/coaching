'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { PlayerQuest } from '@/lib/player-training-quests'

export function QuestsTeaser() {
  const [quests, setQuests] = useState<PlayerQuest[]>([])

  useEffect(() => {
    fetch('/api/player/quests')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        const active = ((d.quests ?? []) as PlayerQuest[]).filter(q => !q.done)
        setQuests(active.slice(0, 2))
      })
      .catch(() => setQuests([]))
  }, [])

  if (quests.length === 0) return null

  return (
    <Link
      href="/player/training"
      style={{
        display: 'block',
        background: 'white',
        borderRadius: 12,
        padding: '14px 16px',
        border: '0.5px solid rgba(0,0,0,0.06)',
        textDecoration: 'none',
        color: 'inherit',
        marginTop: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h3
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            fontWeight: 500,
            margin: 0,
          }}
        >
          This week&apos;s quests
        </h3>
        <span style={{ fontSize: 11, color: '#0F6E56', fontWeight: 500 }}>
          See all →
        </span>
      </div>

      {quests.map(q => (
        <div
          key={q.id}
          style={{
            padding: '6px 0',
            fontSize: 12,
            color: '#444',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ flex: 1 }}>{q.name}</span>
          <span
            style={{
              fontSize: 11,
              color: '#888',
              fontFamily: 'Helvetica Neue, sans-serif',
            }}
          >
            {q.progress} / {q.target}
          </span>
        </div>
      ))}
    </Link>
  )
}
