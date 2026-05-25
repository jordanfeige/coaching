'use client'

import { Check, Loader2 } from 'lucide-react'
import { brand } from '@/lib/brand'
import type { UploadPipelineStep } from '@/lib/film-room/upload-progress'

type StepDef = {
  key: UploadPipelineStep
  title: string
  description: string
  estimate?: string
}

const STEPS: StepDef[] = [
  {
    key: 'uploading',
    title: 'Uploading video',
    description: 'Sending your match video to secure cloud storage',
    estimate: '~1 minute',
  },
  {
    key: 'chunking',
    title: 'Splitting into segments',
    description: 'Breaking your match into 10-minute chunks for analysis',
    estimate: '~3 minutes',
  },
  {
    key: 'analyzing',
    title: 'Analyzing first segment',
    description: 'AI is reviewing the opening segment of your match',
    estimate: '~2 minutes',
  },
  {
    key: 'ready',
    title: 'Match plan ready',
    description: "You'll see your match plan and segment timeline",
  },
]

const ORDER: UploadPipelineStep[] = [
  'uploading',
  'chunking',
  'analyzing',
  'ready',
]

function stepIndex(step: UploadPipelineStep): number {
  if (step === 'failed') return -1
  return ORDER.indexOf(step)
}

function StepIcon({
  state,
}: {
  state: 'done' | 'active' | 'pending'
}) {
  if (state === 'done') {
    return (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: brand.tealDarkHex,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Check size={16} color="#fff" strokeWidth={2.5} />
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `2px solid ${brand.tealDarkHex}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: brand.tealTint,
        }}
      >
        <Loader2
          size={16}
          color={brand.tealDarkHex}
          className="animate-spin"
          style={{ animation: 'spin 1s linear infinite' }}
        />
      </div>
    )
  }
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: `2px solid ${brand.line}`,
        flexShrink: 0,
        background: brand.card,
      }}
    />
  )
}

type UploadProgressProps = {
  currentStep: UploadPipelineStep
  uploadPercent: number | null
  statusError?: string | null
}

export function UploadProgress({
  currentStep,
  uploadPercent,
  statusError,
}: UploadProgressProps) {
  const activeIdx = stepIndex(currentStep)

  if (currentStep === 'failed') {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          background: brand.redLight,
          border: `0.5px solid ${brand.red}`,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: brand.red, margin: 0 }}>
          Processing failed
        </p>
        <p style={{ fontSize: 13, color: brand.red, margin: '8px 0 0', lineHeight: 1.5 }}>
          {statusError || 'Something went wrong while processing your match.'}
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: `0.5px solid ${brand.border}`,
        overflow: 'hidden',
        background: brand.card,
      }}
    >
      {STEPS.map((step, i) => {
        const idx = ORDER.indexOf(step.key)
        let state: 'done' | 'active' | 'pending' = 'pending'
        if (activeIdx >= 0) {
          if (idx < activeIdx) state = 'done'
          else if (idx === activeIdx) state = 'active'
        }

        const isActive = state === 'active'
        const bg =
          state === 'done'
            ? brand.tealTint
            : isActive
              ? 'linear-gradient(180deg, #E1F5EE 0%, #ffffff 100%)'
              : brand.card

        return (
          <div
            key={step.key}
            style={{
              display: 'flex',
              gap: 14,
              padding: '14px 16px',
              background: bg,
              borderTop: i > 0 ? `0.5px solid ${brand.border}` : undefined,
            }}
          >
            <StepIcon state={state} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: isActive ? 'Georgia, serif' : 'inherit',
                  fontSize: isActive ? 15 : 14,
                  fontWeight: isActive ? 500 : 600,
                  color: brand.ink,
                }}
              >
                {step.title}
                {step.key === 'uploading' &&
                  isActive &&
                  uploadPercent != null &&
                  ` — ${uploadPercent}%`}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  color: brand.muted,
                  lineHeight: 1.5,
                }}
              >
                {step.description}
              </p>
              {step.estimate && (isActive || state === 'pending') && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: brand.sub }}>
                  {step.estimate}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
