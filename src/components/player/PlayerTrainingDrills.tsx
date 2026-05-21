'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import MarkDrillCompleteButton from '@/components/player/MarkDrillCompleteButton'
import { usePageReady } from '@/contexts/PageLoadingContext'

export type DrillRow = {
  id: string
  title: string
  description: string | null
  created_at: string
  completed_at: string | null
  lesson_id: string | null
}

const TEAL = '#2D9B7F'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const MUTED = 'hsl(220,10%,65%)'

function drillSourceLabel(drill: DrillRow): string {
  if (drill.lesson_id) return 'Assigned by your coach'
  const desc = drill.description ?? ''
  if (/prescribed from|analysis/i.test(desc)) {
    return `From your ${format(new Date(drill.created_at), 'MMMM d')} reel`
  }
  return 'Assigned from training'
}

function drillFocusArea(drill: DrillRow): string {
  const desc = drill.description ?? ''
  const match = desc.match(/focus[:\s]+([^·.]+)/i)
  if (match) return match[1].trim()
  return drill.title
}

function drillDuration(drill: DrillRow): string {
  const desc = drill.description ?? ''
  const sets = desc.match(/(\d+)\s*sets/i)
  const reps = desc.match(/(\d+)\s*reps/i)
  if (sets && reps) return `${sets[1]} sets · ${reps[1]} reps`
  if (sets) return `${sets[1]} sets`
  return '15–20 min'
}

type Props = {
  playerId?: string | null
  onDrillsLoaded?: (count: number) => void
}

export default function PlayerTrainingDrills({
  playerId: playerIdProp,
  onDrillsLoaded,
}: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [drills, setDrills] = useState<DrillRow[]>([])
  const [playerId, setPlayerId] = useState<string | null>(playerIdProp ?? null)

  const load = useCallback(async () => {
    let pid = playerIdProp ?? null
    if (!pid) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const row = await getLinkedPlayerRowForUser(supabase, user.id)
      pid = row?.id ?? null
    }

    setPlayerId(pid)
    if (!pid) {
      setLoading(false)
      onDrillsLoaded?.(0)
      return
    }

    const { data } = await supabase
      .from('drills')
      .select('id, title, description, created_at, completed_at, lesson_id')
      .eq('player_id', pid)
      .order('created_at', { ascending: false })

    const rows = (data as DrillRow[]) ?? []
    setDrills(rows)
    onDrillsLoaded?.(rows.length)
    setLoading(false)
  }, [onDrillsLoaded, playerIdProp, router, supabase])

  useEffect(() => {
    void load()
  }, [load])

  function handleCompleted(drillId: string, completedAt: string) {
    setDrills(prev =>
      prev.map(d =>
        d.id === drillId ? { ...d, completed_at: completedAt } : d,
      ),
    )
  }

  usePageReady(!loading)

  if (loading) {
    return null
  }

  return (
    <section id="drills" style={{ scrollMarginTop: 24, marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: MUTED,
            margin: 0,
          }}
        >
          Your drills
        </h2>
        {drills.length > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: TEAL,
              background: '#E1F5EE',
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            {drills.length}
          </span>
        )}
      </div>

      {drills.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 20,
            textAlign: 'center',
            color: MUTED,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          No drills assigned yet. They&apos;ll appear here when assigned from a
          reel analysis or lesson.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drills.map(drill => (
            <TrainingDrillCard
              key={drill.id}
              drill={drill}
              onCompleted={completedAt => handleCompleted(drill.id, completedAt)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TrainingDrillCard({
  drill,
  onCompleted,
}: {
  drill: DrillRow
  onCompleted: (completedAt: string) => void
}) {
  const completed = Boolean(drill.completed_at)

  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
            {drill.title}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
            {drillFocusArea(drill)} · {drillDuration(drill)}
          </div>
          <div style={{ fontSize: 11, color: TEAL, marginTop: 6, opacity: 0.9 }}>
            {drillSourceLabel(drill)}
          </div>
          {completed && drill.completed_at && (
            <div
              style={{
                fontSize: 12,
                color: '#166534',
                marginTop: 8,
                fontWeight: 600,
              }}
            >
              ✓ Completed {format(new Date(drill.completed_at), 'MMM d, yyyy')}
            </div>
          )}
        </div>
        {!completed && (
          <MarkDrillCompleteButton
            drillId={drill.id}
            completedAt={drill.completed_at}
            onCompleted={() => {
              const at = new Date().toISOString()
              onCompleted(at)
            }}
            compact
          />
        )}
      </div>
    </div>
  )
}
