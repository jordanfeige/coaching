'use client'

import { useState, type CSSProperties } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase'
import type { ViaCreateDrill } from '@/lib/via-drill'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

interface Props {
  drill: ViaCreateDrill
  onSaved: (message: string) => void
}

export default function ViaDrillSaveCard({ drill, onSaved }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  async function saveDrill(destination: 'lesson' | 'library' | 'both') {
    setSaving(true)
    try {
      const playerId = drill.player_id || null
      const { data: savedDrill, error } = await supabase
        .from('drills')
        .insert({
          title: drill.title,
          description: drill.description,
          player_id: destination === 'library' && !playerId ? null : playerId,
          is_template: destination === 'library' && !playerId,
        })
        .select()
        .single()

      if (error || !savedDrill) {
        onSaved('Could not save that drill. Try again from the player profile.')
        return
      }

      if (
        (destination === 'lesson' || destination === 'both') &&
        playerId
      ) {
        const { data: lesson } = await supabase
          .from('lessons')
          .select('id, starts_at')
          .eq('player_id', playerId)
          .eq('status', 'scheduled')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (lesson) {
          await supabase
            .from('drills')
            .update({ lesson_id: lesson.id })
            .eq('id', savedDrill.id)

          onSaved(
            `Done. "${drill.title}" added to the lesson on ${format(new Date(lesson.starts_at), 'EEE MMM d')}.`,
          )
          return
        }
      }

      onSaved(`"${drill.title}" saved to your drill library.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        width: '100%',
        maxWidth: 320,
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: `0.5px solid ${BORDER}`,
          background: WARM_BG,
        }}
      >
        <div
          style={{ fontSize: 13, fontWeight: 600, color: TEXT }}
        >
          {drill.title}
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>
          {drill.sets} sets · {drill.reps} reps
        </div>
      </div>
      <div
        style={{
          padding: '10px 14px',
          fontSize: 12,
          color: TEXT_SEC,
          lineHeight: 1.6,
        }}
      >
        {drill.description}
        {drill.cue ? (
          <div
            style={{ marginTop: 6, fontStyle: 'italic' }}
          >
            Cue: {drill.cue}
          </div>
        ) : null}
      </div>
      <div
        style={{ padding: '0 14px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveDrill('lesson')}
          style={btnStyle}
        >
          Assign to next lesson
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveDrill('library')}
          style={btnStyle}
        >
          Save to library
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveDrill('both')}
          style={{ ...btnStyle, background: TEAL, color: 'white', border: 'none' }}
        >
          Both
        </button>
      </div>
    </div>
  )
}

const btnStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: `0.5px solid ${BORDER}`,
  background: 'white',
  fontSize: 11,
  color: TEXT,
  cursor: 'pointer',
  fontFamily: 'Arial, sans-serif',
}
