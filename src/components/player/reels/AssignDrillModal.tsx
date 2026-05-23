'use client'

import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'
import { FilmRoomSideDrawer } from '@/components/player/reels/FilmRoomSideDrawer'

type LibraryDrillMatch = {
  id: string
  name: string
  primary_category: string
  duration_minutes: number
  description: string
  steps: string[] | null
  source_attribution: string | null
  coaching_cue: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onAssigned: () => void
} & (
  | {
      matchChunkId: string
      workOnRank: 1 | 2 | 3
      workOnTitle: string
      matchId?: never
    }
  | {
      matchId: string
      workOnTitle: string
      matchChunkId?: never
      workOnRank?: never
    }
)

export function AssignDrillModal(props: Props) {
  const { open, workOnTitle, onClose, onAssigned } = props
  const matchChunkId = 'matchChunkId' in props ? props.matchChunkId : undefined
  const workOnRank = 'workOnRank' in props ? props.workOnRank : undefined
  const matchId = 'matchId' in props ? props.matchId : undefined
  const [drills, setDrills] = useState<LibraryDrillMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setSuccess(false)
    setError(null)
    const qs = matchChunkId
      ? `matchChunkId=${matchChunkId}&workOnRank=${workOnRank}`
      : `matchId=${matchId}&workOnTitle=${encodeURIComponent(workOnTitle)}`
    fetch(`/api/film-room/drill-matches?${qs}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) throw new Error(data.error)
        setDrills(data.drills ?? [])
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load drills')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, matchChunkId, workOnRank, matchId, workOnTitle])

  async function assign(drillLibraryId: string) {
    setAssigningId(drillLibraryId)
    setError(null)
    try {
      const res = await fetch('/api/film-room/assign-drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          matchChunkId
            ? { matchChunkId, workOnRank, drillLibraryId }
            : { matchId, workOnTitle, drillLibraryId },
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Assign failed')
      setSuccess(true)
      onAssigned()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign failed')
    } finally {
      setAssigningId(null)
    }
  }

  return (
    <FilmRoomSideDrawer
      open={open}
      onClose={onClose}
      title={`Find a drill`}
      subtitle={workOnTitle}
      zIndex={210}
    >
      <div style={{ padding: '8px 20px 24px' }}>
        {success ? (
          <p style={{ fontSize: 14, color: brand.tealDarkHex, fontWeight: 600 }}>
            Drill assigned. Find it in Training.
          </p>
        ) : loading ? (
          <p style={{ fontSize: 13, color: brand.muted }}>Searching library…</p>
        ) : drills.length === 0 ? (
          <div>
            <p style={{ fontSize: 13, color: brand.sub, lineHeight: 1.5 }}>
              No drills in the library match this issue yet.
            </p>
            <p style={{ fontSize: 12, color: brand.muted, marginTop: 12 }}>
              Submit for new drill — Coming soon
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {drills.map(d => (
              <div
                key={d.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: `0.5px solid ${brand.line}`,
                  background: brand.card,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{d.name}</p>
                {d.source_attribution && (
                  <p style={{ fontSize: 11, color: brand.muted, margin: '0 0 6px' }}>
                    {d.source_attribution}
                  </p>
                )}
                <p
                  style={{
                    fontSize: 12,
                    color: brand.sub,
                    margin: '0 0 8px',
                    lineHeight: 1.45,
                  }}
                >
                  {d.description.slice(0, 160)}
                  {d.description.length > 160 ? '…' : ''}
                </p>
                <button
                  type="button"
                  disabled={assigningId === d.id}
                  onClick={() => assign(d.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: brand.tealDarkHex,
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {assigningId === d.id ? 'Assigning…' : 'Assign this drill'}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: brand.red, marginTop: 12 }}>{error}</p>
        )}
      </div>
    </FilmRoomSideDrawer>
  )
}
