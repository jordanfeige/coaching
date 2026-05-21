'use client'

import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { ReelNameField } from '@/components/player/reels/ReelNameField'
import { normalizeReelTitle } from '@/lib/reel-display'

type Props = {
  reelId: string
  initialTitle: string
  onSaved?: (title: string) => void
}

export function ReelTitleEditor({ reelId, initialTitle, onSaved }: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const next = normalizeReelTitle(title)
    if (!next) {
      setError('Enter a name for this reel')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/player/reels/${reelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: next }),
      })
      const payload = (await res.json()) as { title?: string; error?: string }
      if (!res.ok) {
        throw new Error(payload.error || 'Could not save name')
      }
      const saved = payload.title ?? next
      setTitle(saved)
      setEditing(false)
      onSaved?.(saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save name')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div style={{ marginBottom: 16 }}>
        <ReelNameField
          value={title}
          onChange={setTitle}
          hint="Ask Via can reference this reel by name."
        />
        {error ? (
          <p style={{ color: '#DC2626', fontSize: 12, margin: '8px 0 0' }}>{error}</p>
        ) : null}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 99,
              border: 'none',
              background: '#0F6E56',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <Check size={14} aria-hidden />
            {saving ? 'Saving…' : 'Save name'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setError(null)
            }}
            disabled={saving}
            style={{
              padding: '8px 14px',
              borderRadius: 99,
              border: '0.5px solid rgba(0,0,0,0.12)',
              background: 'white',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 22,
          fontWeight: 500,
          margin: 0,
          color: '#111',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit reel name"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 10px',
          borderRadius: 99,
          border: '0.5px solid rgba(0,0,0,0.1)',
          background: 'white',
          fontSize: 11,
          fontWeight: 600,
          color: '#0F6E56',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Pencil size={12} aria-hidden />
        Rename
      </button>
    </div>
  )
}
