'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowRight, Calendar, Dumbbell } from 'lucide-react'
import MarkDrillCompleteButton from '@/components/player/MarkDrillCompleteButton'
import {
  BLUE,
  BLUE_TINT,
  INK,
  LINE,
  MUTED,
  SUB,
  TEAL_DARK,
  TEAL_TINT,
  sans,
  serif,
} from '@/lib/player-home-tokens'

type Drill = {
  id: string
  title: string
  description?: string | null
  completed_at?: string | null
}

type Lesson = {
  startsAt: Date
  notes?: string | null
}

type Props = {
  drill: Drill | null
  lesson: Lesson | null
}

export default function PlayerHomeTodaysPlan({ drill, lesson }: Props) {
  const router = useRouter()
  const today = format(new Date(), 'EEEE · MMM d')

  return (
    <section style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          padding: '0 4px',
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: SUB,
          }}
        >
          Today&apos;s plan
        </div>
        <div
          style={{
            fontFamily: serif,
            fontSize: 11,
            fontStyle: 'italic',
            color: MUTED,
          }}
        >
          {today}
        </div>
      </div>

      <div
        className="player-home-plan"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        <div
          style={{
            background: 'white',
            border: `1px solid ${LINE}`,
            borderRadius: 16,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: TEAL_TINT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Dumbbell size={14} color={TEAL_DARK} strokeWidth={2} />
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: SUB,
              }}
            >
              Today&apos;s drill
            </div>
          </div>

          {drill ? (
            <>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 19,
                  fontWeight: 700,
                  color: INK,
                  lineHeight: 1.25,
                  letterSpacing: '-0.2px',
                  marginBottom: 6,
                }}
              >
                {drill.title}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 12.5,
                  color: SUB,
                  lineHeight: 1.55,
                  marginBottom: 18,
                  flex: 1,
                }}
              >
                {drill.description || 'Assigned by your coach.'}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 19,
                  fontWeight: 700,
                  color: INK,
                  lineHeight: 1.25,
                  marginBottom: 6,
                }}
              >
                No drill assigned yet
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 12.5,
                  color: SUB,
                  lineHeight: 1.55,
                  marginBottom: 18,
                  flex: 1,
                }}
              >
                Upload a reel and Via can suggest drills for your focus areas.
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {drill && !drill.completed_at && (
              <MarkDrillCompleteButton
                drillId={drill.id}
                completedAt={drill.completed_at}
                compact
              />
            )}
            <button
              type="button"
              onClick={() => router.push('/player/training#drills')}
              style={{
                flex: 1,
                minWidth: 120,
                padding: '11px',
                background: TEAL_DARK,
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {drill ? 'View drills' : 'Get drills'}{' '}
              <ArrowRight size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            border: `1px solid ${LINE}`,
            borderRadius: 16,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: BLUE_TINT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={14} color={BLUE} strokeWidth={2} />
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: SUB,
              }}
            >
              Next training
            </div>
          </div>

          {lesson ? (
            <>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 19,
                  fontWeight: 700,
                  color: INK,
                  lineHeight: 1.25,
                  letterSpacing: '-0.2px',
                  marginBottom: 6,
                }}
              >
                {format(lesson.startsAt, 'EEEE')} · {format(lesson.startsAt, 'h:mm a')}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 12.5,
                  color: SUB,
                  lineHeight: 1.55,
                  marginBottom: 18,
                  flex: 1,
                }}
              >
                {lesson.notes?.trim() || 'Scheduled with your coach.'}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 19,
                  fontWeight: 700,
                  color: INK,
                  lineHeight: 1.25,
                  marginBottom: 6,
                }}
              >
                No training scheduled
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 12.5,
                  color: SUB,
                  lineHeight: 1.55,
                  marginBottom: 18,
                  flex: 1,
                }}
              >
                Book a session with your coach when you&apos;re ready.
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => router.push('/player/training')}
              style={{
                flex: 1,
                padding: '11px',
                background: 'white',
                color: INK,
                border: `1px solid ${LINE}`,
                borderRadius: 10,
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {lesson ? 'View training' : 'Book training'}
            </button>
            {lesson && (
              <button
                type="button"
                onClick={() => router.push('/player/training')}
                style={{
                  padding: '11px 14px',
                  background: 'transparent',
                  border: `1px solid ${LINE}`,
                  borderRadius: 10,
                  fontFamily: sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: SUB,
                  cursor: 'pointer',
                }}
              >
                Reschedule
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
