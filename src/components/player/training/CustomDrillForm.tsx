'use client'

import { useState } from 'react'
import { DRILL_CATEGORIES, DRILL_MODES, DRILL_SKILL_LEVELS } from '@/lib/drills-library'

type Props = {
  playerId: string
  onClose: () => void
  onSaved: () => void
}

export function CustomDrillForm({ onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState('Forehand')
  const [skillLevel, setSkillLevel] = useState('intermediate')
  const [durationMinutes, setDurationMinutes] = useState(15)
  const [mode, setMode] = useState('solo')
  const [description, setDescription] = useState('')
  const [stepsText, setStepsText] = useState('')
  const [successCriteria, setSuccessCriteria] = useState('')
  const [coachingCue, setCoachingCue] = useState('')
  const [requiresText, setRequiresText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !description.trim()) {
      setError('Name and description are required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/player/drills/library/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          primary_category: primaryCategory,
          skill_level: skillLevel,
          duration_minutes: durationMinutes,
          mode,
          description: description.trim(),
          steps: stepsText
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean),
          success_criteria: successCriteria.trim() || undefined,
          coaching_cue: coachingCue.trim() || undefined,
          requires: requiresText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not save drill')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save drill')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={e => void handleSubmit(e)}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          overflow: 'auto',
          background: 'white',
          borderRadius: 14,
          padding: '18px 16px 24px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 18,
            margin: '0 0 14px',
          }}
        >
          Add custom drill
        </h2>

        {error && (
          <p style={{ color: '#DC2626', fontSize: 12, margin: '0 0 10px' }}>{error}</p>
        )}

        <label style={labelStyle}>
          Name *
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={labelStyle}>
            Category *
            <select
              value={primaryCategory}
              onChange={e => setPrimaryCategory(e.target.value)}
              style={inputStyle}
            >
              {DRILL_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Level *
            <select
              value={skillLevel}
              onChange={e => setSkillLevel(e.target.value)}
              style={inputStyle}
            >
              {DRILL_SKILL_LEVELS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={labelStyle}>
            Duration (min) *
            <input
              type="number"
              min={5}
              max={90}
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Mode *
            <select value={mode} onChange={e => setMode(e.target.value)} style={inputStyle}>
              {DRILL_MODES.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Description *
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Steps (one per line)
          <textarea
            value={stepsText}
            onChange={e => setStepsText(e.target.value)}
            rows={4}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Success criteria
          <textarea
            value={successCriteria}
            onChange={e => setSuccessCriteria(e.target.value)}
            rows={2}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Coaching cue
          <input
            value={coachingCue}
            onChange={e => setCoachingCue(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Equipment (comma-separated)
          <input
            value={requiresText}
            onChange={e => setRequiresText(e.target.value)}
            placeholder="balls, wall, partner"
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 99,
              border: 'none',
              background: '#0F6E56',
              color: 'white',
              fontWeight: 600,
              fontSize: 13,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save drill'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 99,
              border: '0.5px solid rgba(0,0,0,0.12)',
              background: 'white',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#666',
  marginBottom: 12,
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 4,
  padding: '8px 10px',
  borderRadius: 8,
  border: '0.5px solid rgba(0,0,0,0.12)',
  fontSize: 13,
}
