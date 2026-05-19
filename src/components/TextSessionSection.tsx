'use client'

import { useEffect, useRef, useState } from 'react'
import ViaBlob from '@/components/ViaBlob'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

const SPORT_SHOTS: Record<string, string[]> = {
  tennis: ['Forehand', 'Backhand', 'Serve', 'Volley', 'Match play'],
  golf: ['Drive', 'Iron', 'Short game', 'Putting', 'Full round'],
  baseball: ['Batting', 'Pitching', 'Fielding', 'Full game'],
  basketball: ['Free throw', 'Jump shot', 'Layup', 'Full game'],
  pickleball: ['Dink', 'Drive', 'Serve', 'Volley', 'Match play'],
}

export type TextAnalysisResult = {
  overall_score?: number
  areas_to_improve?: unknown[]
  strengths?: unknown[]
  sessionId?: string
  session_id?: string
  source?: string
  clarifyingQuestion?: string
  clarifyingOptions?: string[]
  error?: string
}

interface Props {
  sport: string
  playerId?: string | null
  lessonId?: string | null
  initialDescription?: string
  autoSubmit?: boolean
  onAnalysisComplete: (result: TextAnalysisResult) => void
  onError?: (message: string) => void
}

export default function TextSessionSection({
  sport,
  playerId,
  lessonId,
  initialDescription = '',
  autoSubmit = false,
  onAnalysisComplete,
  onError,
}: Props) {
  const [description, setDescription] = useState(initialDescription)
  const autoSubmitted = useRef(false)
  const [selectedShots, setSelectedShots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [clarifyQ, setClarifyQ] = useState('')
  const [clarifyOptions, setClarifyOptions] = useState<string[]>([])
  const [clarifyAnswer, setClarifyAnswer] = useState('')

  const shots = SPORT_SHOTS[sport] || ['Full session']

  useEffect(() => {
    if (initialDescription) setDescription(initialDescription)
  }, [initialDescription])

  useEffect(() => {
    if (!autoSubmit || autoSubmitted.current || !description.trim()) return
    autoSubmitted.current = true
    void analyze()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when prefilled
  }, [autoSubmit, description])

  function toggleShot(shot: string) {
    setSelectedShots(prev =>
      prev.includes(shot) ? prev.filter(s => s !== shot) : [...prev, shot],
    )
  }

  async function analyze(clarification?: string) {
    if (!description.trim()) return
    setLoading(true)

    const context = [
      `Sport: ${sport}`,
      selectedShots.length > 0 ? `Focus: ${selectedShots.join(', ')}` : '',
      clarification ? `Additional context: ${clarification}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const res = await fetch('/api/text-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          sport,
          context,
          shotTypes: selectedShots,
          playerId: playerId || null,
          lessonId: lessonId || null,
        }),
      })
      const data = (await res.json()) as TextAnalysisResult

      if (!res.ok) {
        onError?.(data.error || 'Analysis failed')
        setLoading(false)
        return
      }

      if (data.clarifyingQuestion) {
        setClarifyQ(data.clarifyingQuestion)
        setClarifyOptions(data.clarifyingOptions || [])
        setLoading(false)
        return
      }

      onAnalysisComplete({ ...data, source: 'text' })
    } catch (e) {
      console.error('Text analysis error:', e)
      onError?.('Could not analyze your session. Try again.')
    }
    setLoading(false)
  }

  const placeholder =
    sport === 'tennis'
      ? 'e.g. My elbow kept dropping on forehands, coach mentioned it three times. Follow through felt better than last week. Footwork was solid throughout...'
      : sport === 'golf'
        ? 'e.g. Struggled with hip rotation today, shots were going left. Ball striking felt clean but lost distance on drives...'
        : "Describe what happened in today's session..."

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '14px 16px',
          background:
            'linear-gradient(135deg, #eaf7f2, #eff3fe 60%, #f5f0fd)',
          borderRadius: 14,
          border: '0.5px solid rgba(29,158,117,.15)',
        }}
      >
        <ViaBlob size={22} />
        <p
          style={{
            fontSize: 13,
            color: TEXT,
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          Tell me how today&apos;s session went — what felt off, what worked well.
          I&apos;ll structure it into issues and strengths and add it to your progress.
        </p>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            marginBottom: 7,
          }}
        >
          What happened today?
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: 110,
            padding: '12px 14px',
            borderRadius: 12,
            border: `0.5px solid ${BORDER}`,
            background: 'white',
            fontSize: 13,
            color: TEXT,
            fontFamily: 'Arial, sans-serif',
            resize: 'none',
            outline: 'none',
            lineHeight: 1.65,
          }}
        />
        <div
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            marginTop: 4,
            textAlign: 'right',
          }}
        >
          {description.length} chars · more detail = better analysis
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            marginBottom: 8,
          }}
        >
          What were you working on?
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {shots.map(shot => {
            const active = selectedShots.includes(shot)
            return (
              <button
                key={shot}
                type="button"
                onClick={() => toggleShot(shot)}
                style={{
                  padding: '6px 13px',
                  borderRadius: 999,
                  background: active ? TEAL : 'white',
                  border: `0.5px solid ${active ? TEAL : BORDER}`,
                  color: active ? 'white' : TEXT_SEC,
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {shot}
              </button>
            )
          })}
        </div>
      </div>

      {clarifyQ && (
        <div
          style={{
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: TEAL,
              marginBottom: 8,
            }}
          >
            Via asks:
          </div>
          <p
            style={{
              fontSize: 13,
              color: TEXT,
              lineHeight: 1.6,
              margin: '0 0 12px',
            }}
          >
            {clarifyQ}
          </p>
          {clarifyOptions.length > 0 ? (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {clarifyOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setClarifyAnswer(opt)
                    setClarifyQ('')
                    setClarifyOptions([])
                    void analyze(opt)
                  }}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '9px 12px',
                    borderRadius: 9,
                    background: 'white',
                    border: `0.5px solid ${BORDER}`,
                    color: TEXT,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              value={clarifyAnswer}
              onChange={e => setClarifyAnswer(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && clarifyAnswer) {
                  setClarifyQ('')
                  void analyze(clarifyAnswer)
                }
              }}
              placeholder="Type your answer..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 9,
                border: `0.5px solid ${BORDER}`,
                background: 'white',
                fontSize: 13,
                color: TEXT,
                fontFamily: 'Arial, sans-serif',
                outline: 'none',
              }}
            />
          )}
        </div>
      )}

      {!clarifyQ && (
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={!description.trim() || loading}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            background: description.trim() && !loading ? TEAL : '#ccc',
            border: 'none',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: description.trim() && !loading ? 'pointer' : 'default',
            fontFamily: 'Arial, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.15s',
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'textSessionSpin 0.8s linear infinite',
                }}
              />
              Via is analyzing...
            </>
          ) : (
            'Add to Reels with Via →'
          )}
        </button>
      )}

      <style>{`
        @keyframes textSessionSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
