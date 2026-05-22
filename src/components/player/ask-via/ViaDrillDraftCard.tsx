'use client'

import { useState } from 'react'
import type { CustomDrillPayload } from '@/lib/drills-library'

export type LibraryDrillDraft = {
  id?: string
  name: string
  primary_category: string
  skill_level: string
  duration_minutes: number
  mode: string
  description: string
  steps?: string[] | null
  success_criteria?: string | null
  coaching_cue?: string | null
}

type Props = {
  kind: 'library' | 'generated'
  drill: LibraryDrillDraft | CustomDrillPayload
  onDismiss: () => void
  onAssigned: (message: string) => void
}

export function ViaDrillDraftCard({ kind, drill, onDismiss, onAssigned }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const libraryId =
    kind === 'library' && 'id' in drill && typeof drill.id === 'string'
      ? drill.id
      : undefined

  async function saveAndAssign() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/player/drills/library/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          libraryId
            ? { libraryDrillId: libraryId }
            : { customDrillData: drill as CustomDrillPayload },
        ),
      })
      const data = (await res.json()) as {
        success?: boolean
        title?: string
        error?: string
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not assign drill')
      }
      onAssigned(
        data.title
          ? `Added "${data.title}" to your practice. Check Training.`
          : 'Drill added to your practice.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign drill')
    } finally {
      setSaving(false)
    }
  }

  const steps = drill.steps?.slice(0, 4) ?? []

  return (
    <div
      style={{
        marginTop: 10,
        padding: '12px 14px',
        background: '#F0FAF6',
        border: '0.5px solid rgba(15,110,86,0.2)',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: '#0F6E56',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {kind === 'generated' ? 'Custom drill draft' : 'Library drill'}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 14,
          fontWeight: 500,
          color: '#111',
          marginBottom: 4,
        }}
      >
        {drill.name}
      </div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>
        {drill.duration_minutes} min · {drill.skill_level} · {drill.mode} ·{' '}
        {drill.primary_category}
      </div>
      <p style={{ fontSize: 11, color: '#444', lineHeight: 1.5, margin: '0 0 8px' }}>
        {drill.description}
      </p>
      {steps.length > 0 && (
        <ul style={{ margin: '0 0 8px', paddingLeft: 16, fontSize: 11, color: '#555' }}>
          {steps.map((s, i) => (
            <li key={i} style={{ marginBottom: 3 }}>
              {s}
            </li>
          ))}
        </ul>
      )}
      {drill.success_criteria && (
        <p style={{ fontSize: 10, color: '#666', margin: '0 0 4px' }}>
          <strong>Success:</strong> {drill.success_criteria}
        </p>
      )}
      {drill.coaching_cue && (
        <p style={{ fontSize: 10, color: '#0F6E56', margin: '0 0 10px', fontStyle: 'italic' }}>
          Cue: {drill.coaching_cue}
        </p>
      )}
      {error && (
        <p style={{ fontSize: 11, color: '#DC2626', margin: '0 0 8px' }}>{error}</p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void saveAndAssign()}
          disabled={saving}
          style={{
            padding: '7px 14px',
            borderRadius: 99,
            border: 'none',
            background: '#0F6E56',
            color: 'white',
            fontSize: 11,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save & assign →'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={saving}
          style={{
            padding: '7px 12px',
            borderRadius: 99,
            border: '0.5px solid rgba(0,0,0,0.12)',
            background: 'white',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Discard
        </button>
      </div>
    </div>
  )
}
