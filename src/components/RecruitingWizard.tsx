'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import ViaBlob from '@/components/ViaBlob'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

interface WizardMessage {
  role: 'via' | 'player'
  content: string
  chips?: string[]
  field?: string
}

export interface WizardData {
  target_division?: string
  pro_interest?: string
  geographic_preference?: string
  scholarship_need?: string
  campus_size?: string
  intended_major?: string
  gpa?: string
  sat_score?: string
  act_score?: string
  tournament_circuit?: string
  career_goal?: string
}

interface Props {
  playerId: string
  playerName: string
  sport: string
  onComplete: () => void
  isCoach?: boolean
}

const QUESTIONS: Array<{
  field: keyof WizardData
  message: (name: string, sport: string, data: WizardData) => string
  chips: string[]
  freeText?: boolean
}> = [
  {
    field: 'target_division',
    message: (name, sport) =>
      `Hey ${name}! Let's build your ${sport} recruiting roadmap. First — what's the dream? Where do you want to end up playing college ${sport}?`,
    chips: [
      'D1 — top programs',
      'D1 — any',
      'Ivy League',
      'D2',
      'D3 academic',
      'Best fit, any level',
    ],
  },
  {
    field: 'pro_interest',
    message: (name, sport) =>
      `Love it. Do you want to keep the door open for professional ${sport} after college, or is playing in college the main goal?`,
    chips: ['Keep pro door open', 'College is the goal', 'Not sure yet'],
  },
  {
    field: 'gpa',
    message: () =>
      `Academics matter just as much as rankings for most programs. What's your GPA right now?`,
    chips: ['3.7 – 4.0', '3.3 – 3.6', '2.9 – 3.2', 'Below 2.9', 'Not sure yet'],
    freeText: true,
  },
  {
    field: 'sat_score',
    message: (_name, _sport, data) => {
      const gpaComment =
        data.gpa === '3.7 – 4.0'
          ? '3.7+ GPA is strong — opens a lot of doors. '
          : data.gpa === '3.3 – 3.6'
            ? 'Solid GPA. '
            : ''
      return `${gpaComment}Have you taken the SAT or ACT yet?`
    },
    chips: [
      'Not yet',
      '900 – 1100',
      '1100 – 1200',
      '1200 – 1350',
      '1350 – 1450',
      '1450+',
    ],
    freeText: true,
  },
  {
    field: 'intended_major',
    message: () =>
      'What do you want to study? This helps match you to schools with strong programs in your field.',
    chips: [
      'Business / finance',
      'STEM / engineering',
      'Pre-med / health',
      'Liberal arts',
      'Kinesiology / sports',
      'Communications',
      'Not sure yet',
    ],
  },
  {
    field: 'geographic_preference',
    message: () =>
      'Any geographic preference? Some players want to stay close to home, others want to explore.',
    chips: [
      'Southeast',
      'Northeast',
      'Midwest',
      'West Coast',
      'South / Texas',
      'Anywhere',
    ],
    freeText: true,
  },
  {
    field: 'scholarship_need',
    message: () => 'How important is an athletic scholarship to your decision?',
    chips: [
      'Need full scholarship',
      'Partial scholarship helps',
      'Academic aid is fine',
      'Not a factor',
    ],
  },
  {
    field: 'campus_size',
    message: () => 'Last one — what kind of campus feels right?',
    chips: [
      'Large university (20k+)',
      'Medium (5k–20k)',
      'Small college (<5k)',
      'No preference',
    ],
  },
]

function parseGpa(value?: string): number | null {
  if (!value || value === 'Not sure yet') return null
  const n = parseFloat(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseSat(value?: string): number | null {
  if (!value || value === 'Not yet') return null
  const match = value.match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

export default function RecruitingWizard({
  playerId,
  playerName,
  sport,
  onComplete,
}: Props) {
  const supabase = createClient()
  const [messages, setMessages] = useState<WizardMessage[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dataRef = useRef<WizardData>({})

  const firstName = playerName.split(' ')[0]
  const displaySport = sport || 'tennis'

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    addViaMessage(0, {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function addViaMessage(stepIndex: number, snapshot: WizardData) {
    if (stepIndex >= QUESTIONS.length) {
      addCompletionMessage()
      return
    }
    const q = QUESTIONS[stepIndex]
    setMessages(prev => [
      ...prev,
      {
        role: 'via',
        content: q.message(firstName, displaySport, snapshot),
        chips: q.chips,
        field: q.field,
      },
    ])
  }

  function addCompletionMessage() {
    setMessages(prev => [
      ...prev,
      {
        role: 'via',
        content: `Perfect. I have everything I need to build your recruiting roadmap. Let me generate your personalized path to college ${displaySport}.`,
      },
    ])
    setDone(true)
    void saveWizardData()
  }

  function handleAnswer(value: string, field: string) {
    setMessages(prev => [...prev, { role: 'player', content: value }])

    const newData = { ...dataRef.current, [field]: value } as WizardData
    dataRef.current = newData
    setData(newData)

    const nextStep = step + 1
    setStep(nextStep)

    setTimeout(() => {
      addViaMessage(nextStep, newData)
    }, 400)
  }

  function handleTextSubmit() {
    if (!input.trim()) return
    const q = QUESTIONS[step]
    if (!q) return
    handleAnswer(input.trim(), q.field)
    setInput('')
  }

  async function saveWizardData() {
    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('recruiting_profiles')
        .select('id')
        .eq('player_id', playerId)
        .maybeSingle()

      const profileData = {
        player_id: playerId,
        target_division: dataRef.current.target_division || null,
        pro_interest: dataRef.current.pro_interest || null,
        geographic_preference: dataRef.current.geographic_preference || null,
        scholarship_need: dataRef.current.scholarship_need || null,
        campus_size: dataRef.current.campus_size || null,
        intended_major: dataRef.current.intended_major || null,
        gpa: parseGpa(dataRef.current.gpa),
        sat_score: parseSat(dataRef.current.sat_score),
        wizard_completed: true,
        wizard_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        await supabase
          .from('recruiting_profiles')
          .update(profileData)
          .eq('id', existing.id)
      } else {
        await supabase.from('recruiting_profiles').insert(profileData)
      }

      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (e) {
      console.error('Wizard save error:', e)
    }
    setSaving(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 500,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `0.5px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <ViaBlob size={26} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>
            Via — recruiting setup
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 20,
                height: 4,
                borderRadius: 2,
                background: i <= step ? TEAL : BORDER,
                opacity: i <= step ? 1 : 0.4,
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'via' ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <ViaBlob size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      background: WARM_BG,
                      borderRadius: '12px 12px 12px 3px',
                      padding: '10px 13px',
                      fontSize: 13,
                      color: TEXT,
                      lineHeight: 1.65,
                      marginBottom: msg.chips?.length ? 8 : 0,
                    }}
                  >
                    {msg.content}
                  </div>
                  {msg.chips && i === messages.length - 1 && !done && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      {msg.chips.map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleAnswer(chip, msg.field!)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 999,
                            border: `0.5px solid ${BORDER}`,
                            background: 'white',
                            fontSize: 12,
                            color: TEXT,
                            cursor: 'pointer',
                            fontFamily: 'Arial, sans-serif',
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    background: '#E1F5EE',
                    borderRadius: '12px 12px 3px 12px',
                    padding: '10px 13px',
                    fontSize: 13,
                    color: '#04342C',
                    lineHeight: 1.65,
                    maxWidth: '80%',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {saving && (
          <div
            style={{
              textAlign: 'center',
              padding: '12px',
              fontSize: 12,
              color: TEXT_MUTED,
            }}
          >
            Building your roadmap...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!done && QUESTIONS[step]?.freeText && (
        <div
          style={{
            padding: '10px 14px',
            borderTop: `0.5px solid ${BORDER}`,
            display: 'flex',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleTextSubmit()
            }}
            placeholder="Or type your answer..."
            style={{
              flex: 1,
              padding: '9px 13px',
              borderRadius: 10,
              border: `0.5px solid ${BORDER}`,
              background: WARM_BG,
              fontSize: 13,
              color: TEXT,
              outline: 'none',
              fontFamily: 'Arial, sans-serif',
            }}
          />
          <button
            type="button"
            onClick={handleTextSubmit}
            disabled={!input.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: input.trim() ? TEAL : BORDER,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
