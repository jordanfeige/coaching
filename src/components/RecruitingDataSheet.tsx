'use client'

import { useRef, useState } from 'react'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

interface DataPoint {
  label: string
  value: string | null
  status: 'good' | 'improve' | 'missing'
  bar?: number
  section: 'tennis' | 'academic' | 'goals'
}

interface Props {
  profile: Record<string, unknown> | null
  onUpdatePreferences: () => void
}

export default function RecruitingDataSheet({
  profile,
  onUpdatePreferences,
}: Props) {
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const utr = profile?.utr_singles != null ? Number(profile.utr_singles) : null
  const gpa = profile?.gpa != null ? Number(profile.gpa) : null
  const sat = profile?.sat_score != null ? Number(profile.sat_score) : null
  const scheduleScore =
    profile?.schedule_strength_score != null
      ? Number(profile.schedule_strength_score)
      : null
  const qualityWins =
    profile?.schedule_quality_wins != null
      ? Number(profile.schedule_quality_wins)
      : null

  const dataPoints: DataPoint[] = [
    {
      label: 'UTR Singles',
      value: utr != null ? utr.toFixed(2) : null,
      status: utr != null ? 'good' : 'missing',
      bar: utr != null ? (utr / 16) * 100 : 0,
      section: 'tennis',
    },
    {
      label: 'Schedule strength',
      value: scheduleScore != null ? `${scheduleScore}/100` : null,
      status:
        scheduleScore == null
          ? 'missing'
          : scheduleScore >= 70
            ? 'good'
            : 'improve',
      bar: scheduleScore ?? 0,
      section: 'tennis',
    },
    {
      label: 'Quality wins',
      value:
        qualityWins != null
          ? `${qualityWins} vs higher rated`
          : null,
      status: qualityWins != null && qualityWins > 0 ? 'good' : 'improve',
      section: 'tennis',
    },
    {
      label: 'GPA',
      value: gpa != null ? String(gpa) : null,
      status: gpa == null ? 'missing' : gpa >= 3.5 ? 'good' : 'improve',
      bar: gpa != null ? (gpa / 4.0) * 100 : 0,
      section: 'academic',
    },
    {
      label: 'SAT score',
      value: sat != null ? String(sat) : null,
      status: sat == null ? 'missing' : sat >= 1200 ? 'good' : 'improve',
      bar: sat != null ? ((sat - 400) / (1600 - 400)) * 100 : 0,
      section: 'academic',
    },
    {
      label: 'Major',
      value: (profile?.intended_major as string) || null,
      status: profile?.intended_major ? 'good' : 'missing',
      section: 'academic',
    },
    {
      label: 'Target division',
      value: (profile?.target_division as string) || null,
      status: profile?.target_division ? 'good' : 'missing',
      section: 'goals',
    },
    {
      label: 'Geography',
      value: (profile?.geographic_preference as string) || null,
      status: profile?.geographic_preference ? 'good' : 'missing',
      section: 'goals',
    },
    {
      label: 'Pro interest',
      value: (profile?.pro_interest as string) || null,
      status: profile?.pro_interest ? 'good' : 'missing',
      section: 'goals',
    },
  ]

  const visiblePills = dataPoints.filter(d => d.value).slice(0, 4)
  const hiddenCount =
    dataPoints.filter(d => d.value).length - visiblePills.length

  const pillColor = (status: DataPoint['status']) =>
    ({
      good: {
        bg: 'rgba(255,255,255,.6)',
        border: 'rgba(29,158,117,.3)',
        color: '#085041',
      },
      improve: {
        bg: 'rgba(255,255,255,.6)',
        border: '#EF9F27',
        color: '#633806',
      },
      missing: {
        bg: 'rgba(255,255,255,.4)',
        border: BORDER,
        color: TEXT_MUTED,
      },
    })[status]

  const dotColor = (status: DataPoint['status']) =>
    ({
      good: '#1D9E75',
      improve: '#EF9F27',
      missing: BORDER,
    })[status]

  const barColor = (status: DataPoint['status']) =>
    ({
      good: '#1D9E75',
      improve: '#EF9F27',
      missing: BORDER,
    })[status]

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY
  }

  function onTouchMove(e: React.TouchEvent) {
    currentY.current = e.touches[0].clientY
    const delta = currentY.current - startY.current
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }

  function onTouchEnd() {
    const delta = currentY.current - startY.current
    if (delta > 80) {
      setOpen(false)
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
  }

  const sections: Array<{ key: DataPoint['section']; label: string }> = [
    { key: 'tennis', label: 'Tennis' },
    { key: 'academic', label: 'Academic' },
    { key: 'goals', label: 'Goals' },
  ]

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 5,
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        {visiblePills.map(dp => {
          const c = pillColor(dp.status)
          return (
            <span
              key={dp.label}
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 999,
                background: c.bg,
                border: `0.5px solid ${c.border}`,
                color: c.color,
              }}
            >
              {dp.label.split(' ')[0]}{' '}
              {dp.status === 'good' ? '✓' : '↗'}
            </span>
          )
        })}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              fontSize: 10,
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.6)',
              border: '0.5px solid rgba(29,158,117,.3)',
              color: '#085041',
              cursor: 'pointer',
            }}
          >
            +{hiddenCount} more
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: 8,
          borderRadius: 9,
          background: 'rgba(255,255,255,.5)',
          border: '0.5px solid rgba(29,158,117,.25)',
          fontSize: 12,
          color: '#085041',
          cursor: 'pointer',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <i
          className="ti ti-info-circle"
          style={{ fontSize: 14 }}
          aria-hidden="true"
        />
        See all data points
        <i
          className="ti ti-chevron-up"
          style={{ fontSize: 12 }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          onClick={e => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.4)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            ref={sheetRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              width: '100%',
              background: 'white',
              borderRadius: '16px 16px 0 0',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0 4px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: BORDER,
                }}
              />
            </div>

            <div
              style={{
                padding: '6px 16px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `0.5px solid ${BORDER}`,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>
                What Via used
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: WARM_BG,
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 7,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: TEXT_MUTED,
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                minHeight: 0,
              }}
            >
              {sections.map(section => {
                const items = dataPoints.filter(
                  d => d.section === section.key,
                )
                if (items.length === 0) return null
                return (
                  <div key={section.key}>
                    <div
                      style={{
                        padding: '7px 16px 4px',
                        background: WARM_BG,
                        borderBottom: `0.5px solid ${BORDER}`,
                        fontSize: 10,
                        fontWeight: 600,
                        color: TEXT_MUTED,
                        textTransform: 'uppercase',
                        letterSpacing: '.07em',
                      }}
                    >
                      {section.label}
                    </div>
                    {items.map(dp => (
                      <div
                        key={dp.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 16px',
                          borderBottom: `0.5px solid ${BORDER}`,
                        }}
                      >
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: dotColor(dp.status),
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{ fontSize: 13, color: TEXT, flex: 1 }}
                        >
                          {dp.label}
                        </span>
                        {dp.bar !== undefined && dp.value && (
                          <div
                            style={{
                              width: 60,
                              height: 4,
                              background: BORDER,
                              borderRadius: 2,
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                height: 4,
                                width: `${Math.min(dp.bar, 100)}%`,
                                background: barColor(dp.status),
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        )}
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: dp.value ? TEXT : TEXT_MUTED,
                            minWidth: 60,
                            textAlign: 'right',
                          }}
                        >
                          {dp.value || 'Not set'}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background:
                              dp.status === 'good'
                                ? '#E1F5EE'
                                : dp.status === 'improve'
                                  ? '#FAEEDA'
                                  : WARM_BG,
                            color:
                              dp.status === 'good'
                                ? '#085041'
                                : dp.status === 'improve'
                                  ? '#633806'
                                  : TEXT_MUTED,
                            flexShrink: 0,
                          }}
                        >
                          {dp.status === 'good'
                            ? '✓'
                            : dp.status === 'improve'
                              ? '↗'
                              : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}

              <div style={{ padding: '14px 16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onUpdatePreferences()
                  }}
                  style={{
                    width: '100%',
                    padding: 11,
                    borderRadius: 10,
                    background: WARM_BG,
                    border: `0.5px solid ${BORDER}`,
                    fontSize: 13,
                    fontWeight: 500,
                    color: TEXT,
                    cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Update my preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
