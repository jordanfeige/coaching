'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import type {
  PlannedDay,
  WeeklyPlanPayload,
} from '@/lib/player-weekly-plan'

function DayPill({ day }: { day: PlannedDay }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        padding: '8px 0 9px',
        background:
          day.status === 'active'
            ? 'white'
            : day.status === 'done'
              ? 'rgba(15,110,86,0.07)'
              : 'rgba(0,0,0,0.025)',
        border:
          day.status === 'active'
            ? '1px solid #0F6E56'
            : '1px solid transparent',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: '#888',
          fontWeight: 500,
          letterSpacing: 0.5,
          marginBottom: 3,
        }}
      >
        {day.letter}
      </div>
      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 14,
          fontWeight: 500,
          color:
            day.status === 'active' || day.status === 'done'
              ? '#0F6E56'
              : '#111',
        }}
      >
        {day.num}
      </div>
    </div>
  )
}

type WeeklyPlanCardProps = {
  onReadyChange?: (ready: boolean) => void
}

export function WeeklyPlanCard({ onReadyChange }: WeeklyPlanCardProps) {
  const [days, setDays] = useState<PlannedDay[]>([])
  const [todayDrills, setTodayDrills] = useState<WeeklyPlanPayload['today'] | null>(
    null,
  )
  const [focus, setFocus] = useState('Building your plan')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/player/weekly-plan')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: WeeklyPlanPayload) => {
        setDays(data.days ?? [])
        setTodayDrills(data.today ?? null)
        setFocus(data.focus || 'Building your plan')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    onReadyChange?.(!loading)
  }, [loading, onReadyChange])

  if (loading) {
    return (
      <div
        style={{
          height: 220,
          background: '#F5F4F0',
          borderRadius: 14,
          marginBottom: 14,
        }}
        aria-busy
      />
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
          Your AI weekly plan
        </h2>
        <Link
          href="/player/analyze"
          style={{
            fontSize: 11,
            color: '#0F6E56',
            fontWeight: 500,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Adapt plan →
        </Link>
      </div>

      <div
        style={{
          background: '#FAEEDA',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Lightbulb
          size={18}
          color="#854F0B"
          style={{ flexShrink: 0, marginTop: 1 }}
          aria-hidden
        />
        <div style={{ fontSize: 12, color: '#854F0B', lineHeight: 1.5 }}>
          Focus this week: {focus}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {days.map(day => (
          <DayPill key={day.date} day={day} />
        ))}
      </div>

      {todayDrills && (
        <>
          <div
            style={{
              fontSize: 11,
              color: '#888',
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
              marginTop: 10,
            }}
          >
            Today · {todayDrills.drills.length} drills · ~{todayDrills.totalMinutes}{' '}
            min
          </div>

          {todayDrills.drills.length > 0 ? (
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                padding: '14px 0 4px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {todayDrills.drills.map(drill => (
                <Link
                  key={drill.id}
                  href="/player/training/drills"
                  style={{
                    flex: '0 0 140px',
                    background: 'rgba(0,0,0,0.025)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#111',
                      lineHeight: 1.3,
                      marginBottom: 4,
                    }}
                  >
                    {drill.title}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#888',
                      fontFamily: 'Helvetica Neue, sans-serif',
                    }}
                  >
                    {drill.duration_minutes} min · {drill.category}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: '#888',
                margin: '12px 0 0',
                lineHeight: 1.5,
              }}
            >
              No open drills today.{' '}
              <Link
                href="/player/training/drills"
                style={{ color: '#0F6E56', fontWeight: 500 }}
              >
                View drill library →
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}
