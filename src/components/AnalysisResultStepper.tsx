'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DrillAssignedToast from '@/components/player/DrillAssignedToast'
import ViaBlob from '@/components/ViaBlob'
import CoachVerifyPanel from '@/components/CoachVerifyPanel'
import ReelScoreSheet, { buildCheckpoints } from '@/components/ReelScoreSheet'
import type { JointMeasurement } from '@/lib/poseAnalysis'
import { fonts, typography } from '@/lib/brand'
import { GlassCard } from '@/components/GlassCard'
import { glass } from '@/lib/glass'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

const CSS = `
  @keyframes slideLeft {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .card-enter-forward {
    animation: slideLeft 0.25s ease forwards;
  }
  .card-enter-back {
    animation: slideRight 0.25s ease forwards;
  }
`

export interface StepperIssue {
  area: string
  severity: 'critical' | 'moderate' | 'minor'
  explanation: string
  drill?: string
  biomechanical_impact?: string
}

export interface StepperStrength {
  area: string
  explanation: string
}

type RawIssue = {
  area?: string
  area_name?: string
  name?: string
  severity?: string
  importance?: string
  explanation?: string
  description?: string
  what_i_see?: string
  consequence?: string
  drill?: string
  drill_name?: string
  biomechanical_impact?: string
  chain_reaction?: string
}

type RawStrength = {
  area?: string
  explanation?: string
  what_i_see?: string
  why_it_helps?: string
}

export function mapAnalysisIssues(raw: unknown[] | undefined): StepperIssue[] {
  return (raw || []).map(item => {
    const i = (typeof item === 'string' ? { area: item } : item) as RawIssue
    const severity = (i.severity || i.importance || 'moderate').toLowerCase()
    const normalizedSeverity: StepperIssue['severity'] =
      severity === 'critical' || severity === 'minor' ? severity : 'moderate'

    return {
      area: i.area || i.area_name || i.name || 'Technique issue',
      severity: normalizedSeverity,
      explanation:
        i.explanation ||
        i.description ||
        i.what_i_see ||
        '',
      drill: i.drill || i.drill_name || '',
      biomechanical_impact:
        i.biomechanical_impact ||
        i.chain_reaction ||
        i.consequence ||
        '',
    }
  })
}

export function mapAnalysisStrengths(raw: unknown[] | undefined): StepperStrength[] {
  return (raw || []).map(item => {
    const s = (typeof item === 'string' ? { area: item } : item) as RawStrength
    return {
      area: s.area || 'Strength',
      explanation: s.explanation || s.what_i_see || s.why_it_helps || '',
    }
  })
}

export type CoachReviewConfig = {
  sessionId: string
  playerId: string
  playerName: string
  lessonId?: string
  source?: 'video' | 'text'
  alreadyVerified?: boolean
  alreadyPublished?: boolean
  onVerified?: () => void
  onPublished?: () => void
}

export type AnalysisViewMode = 'first-view' | 're-view'

interface Props {
  score: number
  sport: string
  shotType?: string
  issues: StepperIssue[]
  strengths: StepperStrength[]
  poseMeasurements?: JointMeasurement[]
  sessionId?: string
  playerId?: string
  session?: Record<string, unknown> | null
  progressHref?: string
  analyzedAt?: string
  viewMode?: AnalysisViewMode
  existingDrillTitles?: string[]
  onSaved?: () => void
  onReanalyze?: () => void
  coachReview?: CoachReviewConfig
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 5,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '12px 0 4px',
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 5,
            borderRadius: 3,
            background: i === current ? TEAL : BORDER,
            width: i === current ? 20 : 7,
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  )
}

function MeasurementBar({
  measured,
  idealMin,
  idealMax,
  label,
  color,
}: {
  measured: number
  idealMin: number
  idealMax: number
  label: string
  color: string
}) {
  const MAX = 180
  const idealLeftPct = (idealMin / MAX) * 100
  const idealWidthPct = ((idealMax - idealMin) / MAX) * 100
  const dotPct = Math.min(100, Math.max(0, (measured / MAX) * 100))

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 7,
        }}
      >
        <span style={{ fontSize: 13, color: TEXT_SEC }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>
          {measured}° · ideal {idealMin}-{idealMax}°
        </span>
      </div>
      <div
        style={{
          height: 10,
          background: WARM_BG,
          borderRadius: 5,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${idealLeftPct}%`,
            width: `${idealWidthPct}%`,
            height: '100%',
            background: 'rgba(29,158,117,.18)',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -4,
            left: `calc(${dotPct}% - 9px)`,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: color,
            border: '2.5px solid white',
            boxShadow: '0 1px 4px rgba(0,0,0,.15)',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 5,
        }}
      >
        <span style={{ fontSize: 10, color: TEXT_MUTED }}>0°</span>
        <span style={{ fontSize: 10, color: TEAL }}>ideal zone</span>
        <span style={{ fontSize: 10, color: TEXT_MUTED }}>180°</span>
      </div>
    </div>
  )
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Next →',
  nextColor = TEXT,
  showBack = true,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  nextColor?: string
  showBack?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: 1,
            padding: 14,
            ...glass.light.chip,
            borderRadius: 12,
            color: TEXT_SEC,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          ← Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        style={{
          flex: showBack ? 2 : 1,
          padding: 14,
          borderRadius: 12,
          background: nextColor,
          border: 'none',
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {nextLabel}
      </button>
    </div>
  )
}

function ScoreCard({
  score,
  sport,
  shotType,
  issues,
  strengths,
  verdict,
  session,
  viewMode = 'first-view',
  analyzedAt,
  onNext,
}: {
  score: number
  sport: string
  shotType?: string
  issues: StepperIssue[]
  strengths: StepperStrength[]
  verdict: string
  session?: Record<string, unknown> | null
  viewMode?: AnalysisViewMode
  analyzedAt?: string
  onNext: () => void
}) {
  const criticalCount = issues.filter(i => i.severity === 'critical').length
  const dateLabel = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div
        style={{
          background:
            'linear-gradient(160deg, #04342C, #085041 55%, #0d1a30)',
          padding: '28px 20px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            fontSize: 180,
            fontWeight: 900,
            color: 'rgba(255,255,255,.04)',
            lineHeight: 1,
            top: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {score}
        </div>

        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(29,158,117,.18)',
                border: '0.5px solid rgba(29,158,117,.3)',
              }}
            >
              <ViaBlob size={22} />
              <span
                style={{
                  fontSize: 11,
                  color: '#5DCAA5',
                  fontWeight: 600,
                }}
              >
                {viewMode === 're-view' ? 'Via · analyzed reel' : 'Via · your analysis'}
              </span>
            </div>
            <ReelScoreSheet
              session={session ?? null}
              checkpoints={buildCheckpoints(session)}
            />
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,.35)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              marginBottom: 6,
            }}
          >
            Technique score
          </div>

          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              color: 'white',
              lineHeight: 1,
              letterSpacing: -4,
              marginBottom: 6,
            }}
          >
            {score}
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,.4)',
              marginBottom: 18,
            }}
          >
            {sport.charAt(0).toUpperCase() + sport.slice(1)}
            {shotType ? ` · ${shotType}` : ''} · {dateLabel}
          </div>

          {viewMode === 're-view' && (
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,.55)',
                marginBottom: 10,
              }}
            >
              Analyzed {dateLabel}
            </div>
          )}

          {viewMode === 'first-view' && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#5DCAA5',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Analysis complete!
            </div>
          )}

          <p
            style={{
              fontSize: 14,
              fontFamily: fonts.sans,
              color: 'rgba(255,255,255,.85)',
              lineHeight: 1.65,
              margin: '0 0 20px',
              fontWeight: 400,
            }}
          >
            {verdict}
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,.35)',
                  marginBottom: 2,
                }}
              >
                issues
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: issues.length > 0 ? '#F09595' : '#5DCAA5',
                }}
              >
                {issues.length}
              </div>
            </div>
            <div style={{ width: 0.5, background: 'rgba(255,255,255,.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,.35)',
                  marginBottom: 2,
                }}
              >
                strengths
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#5DCAA5',
                }}
              >
                {strengths.length}
              </div>
            </div>
            {criticalCount > 0 && (
              <>
                <div style={{ width: 0.5, background: 'rgba(255,255,255,.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,.35)',
                      marginBottom: 2,
                    }}
                  >
                    critical
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#F09595',
                    }}
                  >
                    {criticalCount}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        <button
          type="button"
          onClick={onNext}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            background: TEAL,
            border: 'none',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          See what to fix →
        </button>
      </div>
    </div>
  )
}

function IssueCard({
  issue,
  index,
  total,
  poseMeasurements,
  addedDrills,
  assignedDrills,
  onAddDrill,
  onBack,
  onNext,
  nextLabel,
}: {
  issue: StepperIssue
  index: number
  total: number
  poseMeasurements?: JointMeasurement[]
  addedDrills: Set<string>
  assignedDrills: Set<string>
  onAddDrill: (drill: string) => void | Promise<void>
  onBack: () => void
  onNext: () => void
  nextLabel: string
}) {
  const isCritical = issue.severity === 'critical'
  const isMinor = issue.severity === 'minor'

  const headerBg = isCritical ? '#FEF2F2' : isMinor ? WARM_BG : '#FFFBEB'
  const headerBorder = isCritical ? '#FCA5A5' : isMinor ? BORDER : '#FCD34D'
  const headerColor = isCritical ? '#A32D2D' : isMinor ? TEXT_MUTED : '#854F0B'
  const dotColor = isCritical ? '#DC2626' : isMinor ? TEXT_MUTED : '#D97706'
  const severityLabel = isCritical
    ? 'Critical — fix this first'
    : isMinor
      ? 'Minor'
      : 'Moderate'

  const poseMatch = poseMeasurements?.find(m => {
    const areaWord = issue.area.toLowerCase().split(' ')[0]
    const labelWord = (m.label || '').toLowerCase().split(' ')[0]
    return (
      m.label?.toLowerCase().includes(areaWord) ||
      issue.area.toLowerCase().includes(labelWord)
    )
  })

  const drillAdded = Boolean(
    issue.drill &&
      (addedDrills.has(issue.drill) || assignedDrills.has(issue.drill)),
  )
  const alreadyAssigned = Boolean(
    issue.drill && assignedDrills.has(issue.drill) && !addedDrills.has(issue.drill),
  )

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div
        style={{
          background: headerBg,
          padding: '10px 18px',
          borderBottom: `0.5px solid ${headerBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dotColor,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: headerColor }}>
            {severityLabel}
          </span>
        </div>
        <span style={{ fontSize: 11, color: headerColor }}>
          {index + 1} of {total}
        </span>
      </div>

      <div
        style={{
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: TEXT,
              marginBottom: 4,
            }}
          >
            {issue.area}
          </div>
          <div style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.4 }}>
            {issue.explanation?.split('.')[0]}
          </div>
        </div>

        {poseMatch && (
          <MeasurementBar
            measured={poseMatch.measured}
            idealMin={poseMatch.idealMin}
            idealMax={poseMatch.idealMax}
            label={poseMatch.label}
            color={dotColor}
          />
        )}

        <div
          style={{
            background: WARM_BG,
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.05em',
              marginBottom: 5,
            }}
          >
            Why it matters
          </div>
          <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.65 }}>
            {issue.biomechanical_impact ||
              issue.explanation ||
              'Fixing this will improve your consistency and power.'}
          </div>
        </div>

        {issue.drill && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: TEXT_MUTED,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                marginBottom: 8,
              }}
            >
              Prescribed drill
            </div>
            <div
              style={{
                background: drillAdded ? '#E1F5EE' : WARM_BG,
                border: `0.5px solid ${drillAdded ? 'rgba(29,158,117,.3)' : BORDER}`,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: TEXT,
                    marginBottom: 2,
                  }}
                >
                  {issue.drill}
                </div>
                <div style={{ fontSize: 11, color: TEXT_SEC }}>
                  3 sets · 15 reps
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!drillAdded && issue.drill) onAddDrill(issue.drill)
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: drillAdded ? TEAL : 'white',
                  border: `0.5px solid ${drillAdded ? TEAL : BORDER}`,
                  color: drillAdded ? 'white' : TEXT,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: drillAdded ? 'default' : 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                {alreadyAssigned
                  ? 'Already assigned'
                  : drillAdded
                    ? '✓ Added'
                    : '+ Assign Drill'}
              </button>
            </div>
          </div>
        )}

        <NavButtons onBack={onBack} onNext={onNext} nextLabel={nextLabel} />
      </div>
    </div>
  )
}

function StrengthsCard({
  strengths,
  onBack,
  onNext,
}: {
  strengths: StepperStrength[]
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div
        style={{
          background: '#F0FDF4',
          padding: '10px 18px',
          borderBottom: '0.5px solid #86EFAC',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 14 }}>⭐</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
          What&apos;s working
        </span>
      </div>

      <div
        style={{
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: TEXT,
              marginBottom: 4,
            }}
          >
            Your strengths
          </div>
          <div style={{ fontSize: 13, color: TEXT_SEC }}>
            These are solid — keep doing exactly this
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {strengths.length > 0 ? (
            strengths.map((s, i) => (
              <div
                key={i}
                style={{
                  background: '#F0FDF4',
                  border: '0.5px solid #86EFAC',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: TEAL,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TEXT,
                      marginBottom: 2,
                    }}
                  >
                    {s.area}
                  </div>
                  {s.explanation && (
                    <div
                      style={{
                        fontSize: 12,
                        color: TEXT_SEC,
                        lineHeight: 1.5,
                      }}
                    >
                      {s.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                background: WARM_BG,
                borderRadius: 10,
                padding: 14,
                textAlign: 'center',
                color: TEXT_MUTED,
                fontSize: 13,
              }}
            >
              Keep practicing — strengths will appear as your technique develops
            </div>
          )}
        </div>

        <NavButtons
          onBack={onBack}
          onNext={onNext}
          nextLabel="Save to progress →"
          nextColor={TEAL}
        />
      </div>
    </div>
  )
}

async function assignDrillToTraining(args: {
  title: string
  sport: string
  sessionId?: string
}) {
  const res = await fetch('/api/drills/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: args.title,
      sport: args.sport,
      analysisSessionId: args.sessionId,
    }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? 'Could not assign drill')
  }
  return res.json() as Promise<{ alreadyAssigned?: boolean }>
}

function SaveCard({
  score,
  sport,
  issues,
  addedDrills,
  sessionId,
  playerId,
  progressHref,
  viewMode = 'first-view',
  onReanalyze,
  onSaved,
  onDrillsSaved,
}: {
  score: number
  sport: string
  issues: StepperIssue[]
  addedDrills: Set<string>
  sessionId?: string
  playerId?: string
  progressHref: string
  viewMode?: AnalysisViewMode
  onReanalyze?: () => void
  onSaved?: () => void
  onDrillsSaved?: () => void
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(viewMode === 're-view')
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null)

  async function submitRating(value: 'helpful' | 'not_helpful') {
    setRating(value)
    if (!sessionId) return
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('analysis_feedback').insert({
        user_id: user.id,
        session_id: sessionId,
        feedback_type: 'analysis',
        rating: value === 'helpful' ? 'positive' : 'negative',
        sport,
      })
    } catch (e) {
      console.error('Rating submit failed:', e)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (addedDrills.size > 0 && playerId) {
        for (const drill of addedDrills) {
          await assignDrillToTraining({ title: drill, sport, sessionId })
        }
        onDrillsSaved?.()
      }
      setSaved(true)
      onSaved?.()
    } catch (e) {
      console.error('Save error:', e)
    }
    setSaving(false)
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div
        style={{
          background: 'linear-gradient(160deg, #04342C, #085041)',
          padding: '20px 18px 16px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: 'white',
            letterSpacing: -1,
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          {score}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,.45)',
            marginBottom: 14,
          }}
        >
          {saved ? 'saved to your progress ✓' : 'ready to save'}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(240,149,149,.15)',
              border: '0.5px solid rgba(240,149,149,.3)',
              fontSize: 11,
              color: '#F09595',
            }}
          >
            {issues.length} issues logged
          </span>
          {addedDrills.size > 0 && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(93,202,165,.15)',
                border: '0.5px solid rgba(93,202,165,.3)',
                fontSize: 11,
                color: '#5DCAA5',
              }}
            >
              {addedDrills.size} drill{addedDrills.size !== 1 ? 's' : ''} added
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '18px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {addedDrills.size > 0 && (
          <div
            style={{
              background: WARM_BG,
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: TEXT_MUTED,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                marginBottom: 8,
              }}
            >
              Your drill plan
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from(addedDrills).map((drill, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    background: 'white',
                    borderRadius: 8,
                    border: `0.5px solid ${BORDER}`,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: TEAL,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 12, color: TEXT }}>{drill}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            background: WARM_BG,
            borderRadius: 10,
            padding: '13px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>🔄</span>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: TEXT,
                marginBottom: 3,
              }}
            >
              Come back and re-analyze
            </div>
            <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.55 }}>
              After practicing your drills, film yourself again. Via will compare
              this session to your next one and show you exactly what improved.
            </div>
          </div>
        </div>

        <div
          style={{
            background: WARM_BG,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: TEXT_SEC,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Was this analysis helpful?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => void submitRating('helpful')}
              style={{
                flex: 1,
                padding: 9,
                borderRadius: 9,
                background: rating === 'helpful' ? '#E1F5EE' : 'white',
                border: `0.5px solid ${rating === 'helpful' ? TEAL : BORDER}`,
                color: rating === 'helpful' ? '#0F6E56' : TEXT_SEC,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              👍 Helpful
            </button>
            <button
              type="button"
              onClick={() => void submitRating('not_helpful')}
              style={{
                flex: 1,
                padding: 9,
                borderRadius: 9,
                background: rating === 'not_helpful' ? '#FEF2F2' : 'white',
                border: `0.5px solid ${rating === 'not_helpful' ? '#FCA5A5' : BORDER}`,
                color: rating === 'not_helpful' ? '#DC2626' : TEXT_SEC,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              👎 Not really
            </button>
          </div>
        </div>

        {!saved ? (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              background: saving ? '#ccc' : TEAL,
              border: 'none',
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {saving ? 'Saving...' : 'Save to progress →'}
          </button>
        ) : (
          <div
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              background: '#E1F5EE',
              border: '0.5px solid rgba(29,158,117,.3)',
              color: '#0F6E56',
              fontSize: 14,
              fontWeight: 700,
              textAlign: 'center',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            ✓ Saved to progress
          </div>
        )}

        <button
          type="button"
          onClick={onReanalyze}
          style={{
            width: '100%',
            padding: 13,
            borderRadius: 12,
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            color: TEXT,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          📹 Add another Reel
        </button>

        <button
          type="button"
          onClick={() => router.push(progressHref)}
          style={{
            width: '100%',
            padding: 13,
            borderRadius: 12,
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            color: TEXT,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          📈 View my progress
        </button>
      </div>
    </div>
  )
}

export default function AnalysisResultStepper({
  score,
  sport,
  shotType,
  issues,
  strengths,
  poseMeasurements,
  sessionId,
  playerId,
  session,
  progressHref = '/player/progress',
  analyzedAt,
  viewMode = 'first-view',
  existingDrillTitles = [],
  onSaved,
  onReanalyze,
  coachReview,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [addedDrills, setAddedDrills] = useState<Set<string>>(new Set())
  const [assignedDrills] = useState(
    () => new Set(existingDrillTitles.map(t => t.trim()).filter(Boolean)),
  )
  const [showDrillToast, setShowDrillToast] = useState(false)
  const [animKey, setAnimKey] = useState(viewMode === 're-view' ? -1 : 0)
  const touchStartX = useRef(0)

  useEffect(() => {
    if (!showDrillToast) return
    const t = window.setTimeout(() => setShowDrillToast(false), 5000)
    return () => window.clearTimeout(t)
  }, [showDrillToast])

  const sortedIssues = [...issues].sort((a, b) => {
    const order = { critical: 0, moderate: 1, minor: 2 }
    return order[a.severity] - order[b.severity]
  })

  const totalCards = 1 + sortedIssues.length + 1 + 1

  function goNext() {
    if (viewMode !== 're-view') {
      setDirection('forward')
      setAnimKey(k => k + 1)
    }
    setStep(s => Math.min(s + 1, totalCards - 1))
  }

  function goBack() {
    if (viewMode !== 're-view') {
      setDirection('back')
      setAnimKey(k => k + 1)
    }
    setStep(s => Math.max(s - 1, 0))
  }

  async function addDrill(drill: string) {
    if (!drill || assignedDrills.has(drill) || addedDrills.has(drill)) return

    if (viewMode === 're-view' && playerId) {
      try {
        await assignDrillToTraining({ title: drill, sport, sessionId })
        setShowDrillToast(true)
      } catch (e) {
        console.error('Drill assign failed:', e)
        alert(e instanceof Error ? e.message : 'Could not assign drill. Try again.')
        return
      }
    }

    setAddedDrills(prev => new Set([...prev, drill]))
  }

  const topIssue = sortedIssues[0]
  const verdict = topIssue
    ? `${topIssue.area} is your main issue — ${topIssue.explanation?.split('.')[0]?.toLowerCase() || 'needs work'}. Fix that first and your score climbs fast.`
    : strengths.length > 0
      ? `${strengths[0].area} is your biggest strength. Keep building on it.`
      : "Good effort. Here's what to focus on next."

  const animClass =
    viewMode === 're-view'
      ? ''
      : direction === 'forward'
        ? 'card-enter-forward'
        : 'card-enter-back'

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <style>{CSS}</style>
      {showDrillToast && (
        <DrillAssignedToast onDismiss={() => setShowDrillToast(false)} />
      )}

      <div
        key={viewMode === 're-view' ? `re-${step}` : animKey}
        className={animClass}
        onTouchStart={e => {
          touchStartX.current = e.touches[0].clientX
        }}
        onTouchEnd={e => {
          const diff = touchStartX.current - e.changedTouches[0].clientX
          if (Math.abs(diff) > 50) {
            if (diff > 0 && step < totalCards - 1) goNext()
            if (diff < 0 && step > 0) goBack()
          }
        }}
      >
        <GlassCard mode="light" style={{ borderRadius: 16, padding: 0 }}>
        {step === 0 && (
          <ScoreCard
            score={score}
            sport={sport}
            shotType={shotType}
            issues={sortedIssues}
            strengths={strengths}
            verdict={verdict}
            session={session}
            viewMode={viewMode}
            analyzedAt={analyzedAt}
            onNext={goNext}
          />
        )}

        {step >= 1 && step <= sortedIssues.length && (
          <IssueCard
            issue={sortedIssues[step - 1]}
            index={step - 1}
            total={sortedIssues.length}
            poseMeasurements={poseMeasurements}
            addedDrills={addedDrills}
            assignedDrills={assignedDrills}
            onAddDrill={drill => void addDrill(drill)}
            onBack={goBack}
            onNext={goNext}
            nextLabel={
              step < sortedIssues.length ? 'Next issue →' : 'See strengths →'
            }
          />
        )}

        {step === sortedIssues.length + 1 && (
          <StrengthsCard
            strengths={strengths}
            onBack={goBack}
            onNext={goNext}
          />
        )}

        {step === sortedIssues.length + 2 && coachReview ? (
          <div style={{ padding: '12px 12px 16px' }}>
            <CoachVerifyPanel
              sessionId={coachReview.sessionId}
              lessonId={coachReview.lessonId}
              playerId={coachReview.playerId}
              playerName={coachReview.playerName}
              score={score}
              issues={sortedIssues}
              source={coachReview.source ?? 'video'}
              sport={sport}
              alreadyVerified={coachReview.alreadyVerified}
              alreadyPublished={coachReview.alreadyPublished}
              onVerified={coachReview.onVerified}
              onPublished={coachReview.onPublished}
            />
            <button
              type="button"
              onClick={onReanalyze}
              style={{
                width: '100%',
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: 'white',
                border: `0.5px solid ${BORDER}`,
                color: TEXT,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Analyze another clip
            </button>
          </div>
        ) : (
          step === sortedIssues.length + 2 && (
            <SaveCard
              score={score}
              sport={sport}
              issues={sortedIssues}
              addedDrills={addedDrills}
              sessionId={sessionId}
              playerId={playerId}
              progressHref={progressHref}
              viewMode={viewMode}
              onReanalyze={onReanalyze}
              onSaved={onSaved}
              onDrillsSaved={() => setShowDrillToast(true)}
            />
          )
        )}
        </GlassCard>
      </div>

      <ProgressDots total={totalCards} current={step} />
    </div>
  )
}
