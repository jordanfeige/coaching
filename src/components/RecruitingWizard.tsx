'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { UTRSearchPlayer } from '@/lib/utr'
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
  isUtrSearch?: boolean
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
  utr_player_id?: string
}

type WizardQuestion = {
  field: keyof WizardData
  message: (name: string, sport: string, data: WizardData) => string
  chips: string[]
  freeText?: boolean
  isUtrStep?: boolean
}

interface Props {
  playerId: string
  playerName: string
  sport: string
  onComplete: (profileId?: string) => void
  isCoach?: boolean
}

const QUESTIONS: WizardQuestion[] = [
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
    field: 'utr_player_id',
    message: () =>
      `One more thing — do you have a UTR account? Linking it lets Via show you specific schools and real gaps. You can also skip this and your coach can link it for you.`,
    chips: ['I have a UTR account', 'Skip for now'],
    isUtrStep: true,
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

function formatSaveError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    const err = e as {
      message?: string
      details?: string
      hint?: string
    }
    if (err.message) return err.message
    if (err.details) return err.details
  }
  return 'Save failed. Please try again.'
}

export default function RecruitingWizard({
  playerId,
  playerName,
  sport,
  onComplete,
}: Props) {
  const supabase = createClient()
  const firstName = playerName.split(' ')[0]
  const displaySport = sport || 'tennis'

  const [messages, setMessages] = useState<WizardMessage[]>(() => [
    {
      role: 'via',
      content: QUESTIONS[0].message(firstName, displaySport, {}),
      chips: QUESTIONS[0].chips,
      field: QUESTIONS[0].field,
    },
  ])
  const [input, setInput] = useState('')
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>({})
  const [saving, setSaving] = useState(false)
  const [generatingMessage, setGeneratingMessage] = useState('')
  const [done, setDone] = useState(false)
  const [showUtrSearch, setShowUtrSearch] = useState(false)
  const [utrSearchQuery, setUtrSearchQuery] = useState('')
  const [utrSearchResults, setUtrSearchResults] = useState<UTRSearchPlayer[]>(
    [],
  )
  const [utrSearching, setUtrSearching] = useState(false)
  const [utrLinked, setUtrLinked] = useState(false)
  const [linkedUtrPlayer, setLinkedUtrPlayer] =
    useState<UTRSearchPlayer | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dataRef = useRef<WizardData>({})

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (showUtrSearch && !utrLinked) {
      const name = playerName.trim()
      if (name) {
        setUtrSearchQuery(name)
        const timer = setTimeout(() => {
          void searchUTRWithQuery(name)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [showUtrSearch, utrLinked, playerName])

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

  function advanceWizard(value: string, field: string) {
    setMessages(prev => [...prev, { role: 'player', content: value }])

    const newData = { ...dataRef.current, [field]: value } as WizardData
    dataRef.current = newData
    setData(newData)

    const nextStep = step + 1
    setStep(nextStep)
    setShowUtrSearch(false)

    setTimeout(() => {
      addViaMessage(nextStep, newData)
    }, 400)
  }

  function handleAnswer(
    value: string,
    field: string,
    isUtrStep?: boolean,
  ) {
    if (isUtrStep) {
      if (value === 'I have a UTR account') {
        setShowUtrSearch(true)
        setMessages(prev => [
          ...prev,
          { role: 'player', content: value },
          {
            role: 'via',
            content: 'Search for your name on UTR and pick your profile.',
            isUtrSearch: true,
          },
        ])
        return
      }
      advanceWizard(value, field)
      return
    }

    advanceWizard(value, field)
  }

  async function searchUTRWithQuery(query: string) {
    if (!query.trim()) return
    setUtrSearching(true)
    setUtrSearchResults([])
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: query.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setUtrSearchResults(data.players || [])
      } else {
        console.error('UTR search failed:', data.error)
      }
    } catch (e) {
      console.error('UTR search error:', e)
    }
    setUtrSearching(false)
  }

  async function searchUTR() {
    await searchUTRWithQuery(utrSearchQuery)
  }

  async function linkUTRFromWizard(utrPlayer: UTRSearchPlayer) {
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          utrPlayerId: utrPlayer.id.toString(),
          playerId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setUtrLinked(true)
        setLinkedUtrPlayer(utrPlayer)
        setUtrSearchResults([])
        const newData = {
          ...dataRef.current,
          utr_player_id: utrPlayer.id.toString(),
        }
        dataRef.current = newData
        setData(newData)
        setTimeout(() => {
          advanceWizard(utrPlayer.name, 'utr_player_id')
        }, 1200)
      }
    } catch (e) {
      console.error('UTR link:', e)
    }
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
    setGeneratingMessage('Saving your profile...')

    function parseGpaRange(val: string): number | null {
      if (!val) return null
      const num = parseFloat(val)
      if (!Number.isNaN(num)) return num
      const parts = val
        .split(/[–\-]/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !Number.isNaN(n))
      if (parts.length === 2) {
        return (parts[0] + parts[1]) / 2
      }
      return null
    }

    function parseSatRange(val: string): number | null {
      if (!val || val === 'Not yet') return null
      const num = parseInt(val, 10)
      if (!Number.isNaN(num)) return num
      const parts = val
        .split(/[–\-]/)
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !Number.isNaN(n))
      if (parts.length === 2) {
        return Math.round((parts[0] + parts[1]) / 2)
      }
      return null
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSaving(false)
        setGeneratingMessage('')
        return
      }

      setGeneratingMessage('Saving your answers...')

      const profile = {
        target_division: dataRef.current.target_division || null,
        pro_interest: dataRef.current.pro_interest || null,
        geographic_preference: dataRef.current.geographic_preference || null,
        scholarship_need: dataRef.current.scholarship_need || null,
        campus_size: dataRef.current.campus_size || null,
        intended_major: dataRef.current.intended_major || null,
        gpa: parseGpaRange(dataRef.current.gpa || ''),
        sat_score: parseSatRange(dataRef.current.sat_score || ''),
      }

      setGeneratingMessage('Matching you to schools...')

      const res = await fetch('/api/recruiting-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, profile }),
      })

      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        profileId?: string
      }

      if (!res.ok) {
        throw new Error(json.error || `Save failed (${res.status})`)
      }

      setGeneratingMessage('Building your roadmap...')

      const finalProfileId = json.profileId
      if (finalProfileId) {
        const gpaVal = parseGpaRange(dataRef.current.gpa || '')
        const satVal = parseSatRange(dataRef.current.sat_score || '')
        await fetch('/api/recruiting-projection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: finalProfileId,
            playerId,
            playerName,
            sport: displaySport,
            targetDivision: dataRef.current.target_division || null,
            gpa: gpaVal,
            sat: satVal,
            major: dataRef.current.intended_major || null,
            geo: dataRef.current.geographic_preference || null,
            scholarship: dataRef.current.scholarship_need || null,
            campusSize: dataRef.current.campus_size || null,
            proInterest: dataRef.current.pro_interest || null,
          }),
        })
      }

      await new Promise(r => setTimeout(r, 800))

      onComplete(finalProfileId)
    } catch (e: unknown) {
      console.error('Wizard save:', formatSaveError(e), e)
      setSaving(false)
      setGeneratingMessage('')
      setDone(false)
      const detail = formatSaveError(e)
      setMessages(prev => [
        ...prev,
        {
          role: 'via',
          content:
            detail === 'Save failed. Please try again.'
              ? 'Something went wrong saving your profile. Please try again.'
              : `Something went wrong saving your profile: ${detail}`,
        },
      ])
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: 580,
        maxHeight: '80vh',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
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
            Setup your recruiting profile
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
          minHeight: 0,
          maxHeight: 460,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.map((msg, i) => {
          const q = msg.field
            ? QUESTIONS.find(question => question.field === msg.field)
            : undefined
          const isLastVia =
            msg.role === 'via' && i === messages.length - 1 && !done

          return (
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
                      marginBottom:
                        msg.chips?.length || msg.isUtrSearch ? 8 : 0,
                    }}
                  >
                    {msg.content}
                  </div>

                  {msg.isUtrSearch && (
                    <div style={{ marginTop: 8 }}>
                      {!utrLinked ? (
                        <>
                          <div
                            style={{
                              display: 'flex',
                              gap: 7,
                              marginBottom: 8,
                            }}
                          >
                            <input
                              value={utrSearchQuery}
                              onChange={e =>
                                setUtrSearchQuery(e.target.value)
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter') void searchUTR()
                              }}
                              placeholder="Search your name..."
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: 9,
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
                              onClick={() => void searchUTR()}
                              disabled={
                                utrSearching || !utrSearchQuery.trim()
                              }
                              style={{
                                padding: '8px 14px',
                                borderRadius: 9,
                                background: utrSearching ? BORDER : TEAL,
                                border: 'none',
                                color: 'white',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                                fontFamily: 'Arial, sans-serif',
                              }}
                            >
                              {utrSearching ? '...' : 'Search'}
                            </button>
                          </div>

                          {utrSearchResults.length > 0 && (
                            <div
                              style={{
                                border: `0.5px solid ${BORDER}`,
                                borderRadius: 10,
                                overflow: 'hidden',
                                marginBottom: 8,
                              }}
                            >
                              {utrSearchResults.map((p, ri) => (
                                <div
                                  key={p.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '9px 12px',
                                    borderTop:
                                      ri > 0
                                        ? `0.5px solid ${BORDER}`
                                        : 'none',
                                    background:
                                      ri % 2 === 0 ? 'white' : WARM_BG,
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 500,
                                        color: TEXT,
                                      }}
                                    >
                                      {p.name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: TEXT_MUTED,
                                      }}
                                    >
                                      UTR {p.singlesUtr || '—'}
                                      {p.location ? ` · ${p.location}` : ''}
                                      {p.ageRange ? ` · ${p.ageRange}` : ''}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void linkUTRFromWizard(p)
                                    }
                                    style={{
                                      padding: '5px 11px',
                                      borderRadius: 7,
                                      background: TEAL,
                                      border: 'none',
                                      color: 'white',
                                      fontSize: 11,
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                      fontFamily: 'Arial, sans-serif',
                                    }}
                                  >
                                    That&apos;s me →
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setShowUtrSearch(false)
                              advanceWizard('Skipped', 'utr_player_id')
                            }}
                            style={{
                              fontSize: 11,
                              color: TEXT_MUTED,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              fontFamily: 'Arial, sans-serif',
                            }}
                          >
                            Skip for now
                          </button>
                        </>
                      ) : (
                        <div
                          style={{
                            padding: '8px 12px',
                            background: '#E1F5EE',
                            borderRadius: 9,
                            border: '0.5px solid #9FE1CB',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <i
                            className="ti ti-check"
                            style={{ fontSize: 16, color: '#1D9E75' }}
                            aria-hidden="true"
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: '#085041',
                              }}
                            >
                              {linkedUtrPlayer?.name} linked
                            </div>
                            <div style={{ fontSize: 11, color: '#0F6E56' }}>
                              UTR {linkedUtrPlayer?.singlesUtr} · syncing
                              automatically
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.chips &&
                    isLastVia &&
                    !showUtrSearch &&
                    !msg.isUtrSearch && (
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
                          onClick={() =>
                            handleAnswer(
                              chip,
                              msg.field!,
                              q?.isUtrStep,
                            )
                          }
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
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {saving && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            zIndex: 10,
            borderRadius: 'inherit',
          }}
        >
          <ViaBlob size={48} thinking />
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: TEXT,
                marginBottom: 6,
              }}
            >
              Building your roadmap
            </div>
            <div
              style={{
                fontSize: 13,
                color: TEXT_MUTED,
                lineHeight: 1.6,
              }}
            >
              {generatingMessage || 'Saving your profile...'}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 4,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {['Saving profile', 'Matching schools', 'Building roadmap'].map(
              (step, i) => (
                <div
                  key={step}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    background: '#E1F5EE',
                    border: '0.5px solid #9FE1CB',
                    fontSize: 11,
                    color: '#085041',
                    animation: `fadeIn 0.4s ease ${i * 0.5}s both`,
                  }}
                >
                  {step}
                </div>
              ),
            )}
          </div>
        </div>
      )}

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
