'use client'

import { useState } from 'react'
import RecruitingWizard from '@/components/RecruitingWizard'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const TEAL_DARK = '#085041'

interface Props {
  player: { id: string; name: string; sport?: string }
  onComplete: () => void
}

export default function CoachRecruitingWaiting({
  player,
  onComplete,
}: Props) {
  const [showCoachWizard, setShowCoachWizard] = useState(false)
  const [reminderSent, setReminderSent] = useState(false)
  const firstName = player.name.split(' ')[0]

  return (
    <>
      <div
        style={{
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `0.5px solid ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#E1F5EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 500,
              color: TEAL_DARK,
            }}
          >
            {player.name
              .split(' ')
              .map(w => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>
              {player.name}
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>
              {player.sport || 'tennis'}
            </div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              padding: '3px 10px',
              borderRadius: 999,
              background: '#FAEEDA',
              border: '0.5px solid #EF9F27',
              fontSize: 10,
              color: '#633806',
              fontWeight: 500,
            }}
          >
            Setup needed
          </span>
        </div>

        <div style={{ padding: '16px', background: WARM_BG }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              marginBottom: 14,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#854F0B"
              strokeWidth="1.5"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: TEXT,
                  marginBottom: 3,
                }}
              >
                {firstName} hasn&apos;t set up their recruiting profile yet
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: TEXT_SEC,
                  lineHeight: 1.6,
                }}
              >
                Via needs their goals, academic profile, and preferences before
                generating a projection. Takes about 3 minutes.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch('/api/send-recruiting-reminder', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ playerId: player.id }),
                })
                if (res.ok) {
                  setReminderSent(true)
                } else {
                  const err = await res.json()
                  alert(err.error || 'Could not send reminder')
                }
              }}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: 9,
                background: 'white',
                border: `0.5px solid ${BORDER}`,
                color: TEXT_SEC,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {reminderSent ? 'Reminder sent ✓' : 'Send reminder'}
            </button>
            <button
              type="button"
              onClick={() => setShowCoachWizard(true)}
              style={{
                flex: 2,
                padding: '9px',
                borderRadius: 9,
                background: TEAL,
                border: 'none',
                color: 'white',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Fill in for {firstName}
            </button>
          </div>
        </div>
      </div>

      {showCoachWizard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowCoachWizard(false)
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: `0.5px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>
                Fill in for {firstName}
              </span>
              <button
                type="button"
                onClick={() => setShowCoachWizard(false)}
                style={{
                  background: WARM_BG,
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 7,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: TEXT_MUTED,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <RecruitingWizard
                playerId={player.id}
                playerName={player.name}
                sport={player.sport || 'tennis'}
                isCoach
                onComplete={() => {
                  setShowCoachWizard(false)
                  onComplete()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
