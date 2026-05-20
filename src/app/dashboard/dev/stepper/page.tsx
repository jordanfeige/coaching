'use client'

import { useMemo, useState } from 'react'
import AnalysisResultStepper, {
  mapAnalysisIssues,
  mapAnalysisStrengths,
} from '@/components/AnalysisResultStepper'
import type { JointMeasurement } from '@/lib/poseAnalysis'

/** Mirrors `/api/video-analysis` shape — edit to test different card counts / severities. */
const MOCK_ANALYSIS = {
  overall_score: 72,
  score: 72,
  sport: 'tennis',
  shot_type: 'forehand',
  sessionId: '00000000-0000-4000-8000-000000000001',
  areas_to_improve: [
    {
      area: 'Unit turn',
      severity: 'critical',
      explanation:
        'Your shoulders stay square to the net through the load phase, so you are arming the ball instead of coiling.',
      drill: 'Shadow forehands with a towel under both arms',
      biomechanical_impact: 'Less racket-head speed and inconsistent contact point.',
    },
    {
      area: 'Contact height',
      severity: 'moderate',
      explanation: 'Contact drifts below waist on several swings — late preparation is the likely cause.',
      drill: 'Feed toss drills: catch at contact height before hitting',
    },
    {
      area: 'Follow-through finish',
      severity: 'minor',
      explanation: 'Finish occasionally stops at shoulder height instead of wrapping over the opposite shoulder.',
    },
  ],
  strengths: [
    {
      area: 'Split step timing',
      explanation: 'You recover to a balanced athletic base before the opponent strikes — strong court positioning habit.',
    },
    {
      area: 'Grip stability',
      explanation: 'Eastern grip stays consistent through contact; no visible wrist breakdown on topspin swings.',
    },
  ],
}

const MOCK_POSE: JointMeasurement[] = [
  {
    joint: 'elbow_contact',
    label: 'Elbow at contact',
    measured: 118,
    idealMin: 80,
    idealMax: 110,
    deficit: 8,
    status: 'warning',
  },
  {
    joint: 'hip_shoulder_sep',
    label: 'Hip-shoulder separation',
    measured: 28,
    idealMin: 40,
    idealMax: 60,
    deficit: 12,
    status: 'critical',
  },
]

export default function StepperDevPage() {
  const [coachMode, setCoachMode] = useState(true)

  const issues = useMemo(
    () =>
      mapAnalysisIssues(MOCK_ANALYSIS.areas_to_improve as unknown[] | undefined),
    [],
  )
  const strengths = useMemo(
    () => mapAnalysisStrengths(MOCK_ANALYSIS.strengths as unknown[] | undefined),
    [],
  )

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
        <p className="font-medium">Stepper preview (dev)</p>
        <p className="mt-2 text-muted-foreground">
          This page renders <code className="text-xs">AnalysisResultStepper</code> from a fixed mock
          analysis. In the app, the same stepper opens from <strong>View reel</strong> on saved analyses
          and right after <strong>Add to Reels</strong> / <strong>Re-run reel</strong>.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={coachMode}
            onChange={e => setCoachMode(e.target.checked)}
            className="rounded"
          />
          <span>Coach review flow (verify / publish cards on last steps)</span>
        </label>
      </div>

      <AnalysisResultStepper
        score={MOCK_ANALYSIS.overall_score}
        sport="tennis"
        shotType={MOCK_ANALYSIS.shot_type}
        issues={issues}
        strengths={strengths}
        poseMeasurements={MOCK_POSE}
        sessionId={MOCK_ANALYSIS.sessionId}
        playerId="00000000-0000-4000-8000-000000000002"
        coachReview={
          coachMode
            ? {
                sessionId: MOCK_ANALYSIS.sessionId,
                playerId: '00000000-0000-4000-8000-000000000002',
                playerName: 'Preview Player',
                source: 'video',
                onVerified: () => alert('onVerified (mock)'),
                onPublished: () => alert('onPublished (mock)'),
              }
            : undefined
        }
        onReanalyze={() => alert('onReanalyze (mock)')}
      />
    </div>
  )
}
