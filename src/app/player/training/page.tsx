'use client'

import { useEffect } from 'react'
import PlayerPageVia from '@/components/player/PlayerPageVia'
import PlayerTrainingDrills from '@/components/player/PlayerTrainingDrills'
import { playerTrainingMock } from '@/lib/player-journey-mock'
import { fonts } from '@/lib/brand'

const TEAL = '#2D9B7F'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = '#F5F4F0'

export default function PlayerTrainingPage() {
  const { nextSession, recentSessions } = playerTrainingMock

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#drills') return
    const el = document.getElementById('drills')
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  return (
    <div
      style={{
        fontFamily: fonts.sans,
        color: TEXT,
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 0 40px',
        background: WARM_BG,
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <PlayerPageVia pageContext={{ page: 'player-training' }} />

      <h1
        style={{
          fontFamily: fonts.serif,
          fontSize: 24,
          fontWeight: 400,
          margin: '0 0 14px',
        }}
      >
        Training
      </h1>

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: TEXT_MUTED,
          marginBottom: 8,
        }}
      >
        Upcoming sessions
      </div>
      <div
        style={{
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          padding: '16px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: TEXT_MUTED,
            marginBottom: 8,
          }}
        >
          Next session
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          {nextSession.date} · {nextSession.time}
        </div>
        <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>
          {nextSession.focus}
        </div>
        <div style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>
          with {nextSession.coachName}
        </div>
      </div>

      <PlayerTrainingDrills />

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: TEXT_MUTED,
          margin: '20px 0 8px',
        }}
      >
        Recent sessions
      </div>
      {recentSessions.map(session => (
        <div
          key={session.id}
          style={{
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{session.focus}</span>
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>{session.date}</span>
          </div>
          <div style={{ fontSize: 12, color: TEAL, marginTop: 4 }}>{session.rating}</div>
        </div>
      ))}
    </div>
  )
}
