'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { LibraryDrillRow } from '@/lib/drills-library'

type Props = {
  drill: LibraryDrillRow
}

export function DrillLibraryDetailClient({ drill }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function addToPractice() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/player/drills/library/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryDrillId: drill.id }),
      })
      const data = (await res.json()) as {
        success?: boolean
        title?: string
        error?: string
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not assign drill')
      }
      setMessage(
        data.title
          ? `Added "${data.title}" to your practice.`
          : 'Added to your practice.',
      )
      setTimeout(() => router.push('/player/training'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign drill')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Link
        href="/player/training/drills"
        style={{
          display: 'inline-block',
          fontSize: 12,
          color: '#0F6E56',
          fontWeight: 500,
          textDecoration: 'none',
          marginBottom: 14,
        }}
      >
        ← Drill library
      </Link>

      <span
        style={{
          display: 'inline-block',
          fontSize: 9,
          fontWeight: 600,
          color: '#0F6E56',
          background: '#E1F5EE',
          padding: '2px 8px',
          borderRadius: 99,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {drill.primary_category}
      </span>

      <h1
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 22,
          fontWeight: 500,
          margin: '0 0 10px',
          color: '#111',
        }}
      >
        {drill.name}
      </h1>

      <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
        {drill.duration_minutes} min · {drill.skill_level} · {drill.mode}
        {drill.requires?.length ? ` · ${drill.requires.join(', ')}` : ''}
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 12,
          border: '0.5px solid rgba(0,0,0,0.06)',
          padding: '16px 18px',
          marginBottom: 14,
        }}
      >
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#333', margin: '0 0 14px' }}>
          {drill.description}
        </p>

        {drill.steps && drill.steps.length > 0 && (
          <>
            <h2 style={sectionTitle}>Steps</h2>
            <ol style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: 13, color: '#444' }}>
              {drill.steps.map((step, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {step}
                </li>
              ))}
            </ol>
          </>
        )}

        {drill.success_criteria && (
          <>
            <h2 style={sectionTitle}>Success criteria</h2>
            <p style={{ fontSize: 13, color: '#444', margin: '0 0 12px' }}>
              {drill.success_criteria}
            </p>
          </>
        )}

        {drill.coaching_cue && (
          <>
            <h2 style={sectionTitle}>Coaching cue</h2>
            <p
              style={{
                fontSize: 13,
                color: '#0F6E56',
                fontStyle: 'italic',
                margin: '0 0 12px',
              }}
            >
              {drill.coaching_cue}
            </p>
          </>
        )}

        {drill.source_attribution && (
          <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
            Source: {drill.source_attribution}
          </p>
        )}
      </div>

      {message && (
        <p style={{ fontSize: 13, color: '#0F6E56', marginBottom: 10 }}>{message}</p>
      )}
      {error && (
        <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 10 }}>{error}</p>
      )}

      <button
        type="button"
        onClick={() => void addToPractice()}
        disabled={saving}
        style={{
          width: '100%',
          padding: '12px 18px',
          borderRadius: 99,
          border: 'none',
          background: '#0F6E56',
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Adding…' : 'Add to my practice →'}
      </button>
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 8px',
}
