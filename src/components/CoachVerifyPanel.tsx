'use client'

import { useState } from 'react'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const RED = '#DC2626'
const AMBER = '#D97706'

interface Issue {
  area: string
  severity: 'critical' | 'moderate' | 'minor'
  explanation: string
  drill?: string
}

interface Override {
  area: string
  action: 'dismiss' | 'severity_change' | 'add'
  newSeverity?: 'critical' | 'moderate' | 'minor'
  coachNote?: string
  coachAdded?: boolean
}

interface Props {
  sessionId: string
  lessonId?: string
  playerId: string
  playerName: string
  score: number
  issues: Issue[]
  source: 'video' | 'text'
  sport?: string
  alreadyVerified?: boolean
  alreadyPublished?: boolean
  onVerified?: () => void
  onPublished?: () => void
}

export default function CoachVerifyPanel({
  sessionId,
  lessonId,
  playerName,
  score,
  issues,
  source,
  sport = 'tennis',
  alreadyVerified = false,
  alreadyPublished = false,
  onVerified,
  onPublished,
}: Props) {
  const firstName = playerName.split(' ')[0]

  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [newIssueOpen, setNewIssueOpen] = useState(false)
  const [newIssueText, setNewIssueText] = useState('')
  const [newIssueSeverity, setNewIssueSeverity] = useState<
    'critical' | 'moderate' | 'minor'
  >('moderate')
  const [coachNote, setCoachNote] = useState('')
  const [scoreOverride, setScoreOverride] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [verified, setVerified] = useState(alreadyVerified)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(alreadyPublished)
  const [addingIssue, setAddingIssue] = useState(false)

  function setOverride(area: string, override: Partial<Override>) {
    setOverrides(prev => ({
      ...prev,
      [area]: {
        ...prev[area],
        area,
        action: prev[area]?.action || 'severity_change',
        ...override,
      },
    }))
  }

  function dismissIssue(area: string) {
    setOverrides(prev => ({
      ...prev,
      [area]: { area, action: 'dismiss' },
    }))
  }

  function undoOverride(key: string) {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function addIssue() {
    if (!newIssueText.trim()) return
    setAddingIssue(true)
    try {
      const res = await fetch('/api/structure-coach-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newIssueText,
          severity: newIssueSeverity,
          sport,
          sessionId,
        }),
      })
      const data = await res.json()
      const newKey = `coach_${Date.now()}`
      setOverrides(prev => ({
        ...prev,
        [newKey]: {
          area: data.area || newIssueText,
          action: 'add',
          newSeverity: newIssueSeverity,
          coachNote: newIssueText,
          coachAdded: true,
        },
      }))
      setNewIssueText('')
      setNewIssueOpen(false)
    } catch (e) {
      console.error('Structure issue error:', e)
    }
    setAddingIssue(false)
  }

  async function handleVerify(andPublish = false) {
    setSaving(true)
    try {
      const res = await fetch('/api/coach-verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          overrides: Object.values(overrides),
          coachNote: coachNote || null,
          scoreOverride,
          publish: andPublish,
        }),
      })
      if (!res.ok) {
        console.error('Verify failed')
        setSaving(false)
        return
      }
      setVerified(true)
      if (andPublish) setPublished(true)
      onVerified?.()
      if (andPublish) onPublished?.()
    } catch (e) {
      console.error('Verify error:', e)
    }
    setSaving(false)
  }

  async function handlePublishOnly() {
    setPublishing(true)
    try {
      await fetch('/api/coach-verify-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      setPublished(true)
      onPublished?.()
    } catch (e) {
      console.error('Publish error:', e)
    }
    setPublishing(false)
  }

  const pendingOverrides = Object.keys(overrides).length
  const finalScore = scoreOverride ?? score
  const addedIssues = Object.entries(overrides).filter(
    ([, o]) => o.action === 'add',
  )

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          borderBottom: `0.5px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: TEXT,
              marginBottom: 2,
            }}
          >
            Coach review
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>
            {firstName} · {source === 'text' ? 'Text session' : 'Reel analysis'}
            {lessonId ? ' · tied to lesson' : ''}
          </div>
        </div>
        {verified && (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: '#E1F5EE',
              border: '0.5px solid rgba(29,158,117,.25)',
              fontSize: 11,
              color: '#0F6E56',
              fontWeight: 600,
            }}
          >
            ✓ Verified
          </div>
        )}
      </div>

      <div
        style={{
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 8,
            }}
          >
            Score
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: TEAL,
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              {finalScore}
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Via&apos;s score</div>
            <div style={{ marginLeft: 'auto' }}>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Override"
                value={scoreOverride ?? ''}
                onChange={e =>
                  setScoreOverride(
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                style={{
                  width: 90,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: `0.5px solid ${BORDER}`,
                  background: WARM_BG,
                  fontSize: 13,
                  color: TEXT,
                  fontFamily: 'Arial, sans-serif',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              {scoreOverride !== null && (
                <button
                  type="button"
                  onClick={() => setScoreOverride(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: TEXT_MUTED,
                    fontSize: 11,
                    cursor: 'pointer',
                    marginLeft: 4,
                  }}
                >
                  reset
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 8,
            }}
          >
            Via found {issues.length} issue{issues.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {issues.map(issue => {
              const override = overrides[issue.area]
              const dismissed = override?.action === 'dismiss'
              const severityChanged = override?.action === 'severity_change'
              const dotColor = dismissed
                ? '#ccc'
                : (override?.newSeverity || issue.severity) === 'critical'
                  ? RED
                  : AMBER

              return (
                <div
                  key={issue.area}
                  style={{
                    background: dismissed ? WARM_BG : 'white',
                    border: `0.5px solid ${dismissed ? BORDER : `${dotColor}66`}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    opacity: dismissed ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: dismissed ? 0 : 8,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: dotColor,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: dismissed ? TEXT_MUTED : TEXT,
                        flex: 1,
                        textDecoration: dismissed ? 'line-through' : 'none',
                      }}
                    >
                      {issue.area}
                    </span>
                    {dismissed ? (
                      <button
                        type="button"
                        onClick={() => undoOverride(issue.area)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: TEAL,
                          fontSize: 11,
                          cursor: 'pointer',
                          fontFamily: 'Arial, sans-serif',
                        }}
                      >
                        Undo
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(['critical', 'moderate', 'minor'] as const).map(
                          sev => (
                            <button
                              key={sev}
                              type="button"
                              onClick={() => {
                                if (
                                  sev === issue.severity &&
                                  !severityChanged
                                )
                                  return
                                setOverride(issue.area, {
                                  newSeverity: sev,
                                  action: 'severity_change',
                                })
                              }}
                              style={{
                                padding: '3px 7px',
                                borderRadius: 6,
                                background:
                                  (override?.newSeverity || issue.severity) ===
                                  sev
                                    ? sev === 'critical'
                                      ? '#FEF2F2'
                                      : sev === 'moderate'
                                        ? '#FFFBEB'
                                        : WARM_BG
                                    : 'white',
                                border: `0.5px solid ${
                                  (override?.newSeverity || issue.severity) ===
                                  sev
                                    ? sev === 'critical'
                                      ? '#FCA5A5'
                                      : sev === 'moderate'
                                        ? '#FCD34D'
                                        : BORDER
                                    : BORDER
                                }`,
                                color:
                                  (override?.newSeverity || issue.severity) ===
                                  sev
                                    ? sev === 'critical'
                                      ? RED
                                      : sev === 'moderate'
                                        ? AMBER
                                        : TEXT_MUTED
                                    : TEXT_MUTED,
                                fontSize: 10,
                                cursor: 'pointer',
                                fontFamily: 'Arial, sans-serif',
                                fontWeight:
                                  (override?.newSeverity || issue.severity) ===
                                  sev
                                    ? 600
                                    : 400,
                                textTransform: 'capitalize',
                              }}
                            >
                              {sev}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          onClick={() => dismissIssue(issue.area)}
                          style={{
                            padding: '3px 7px',
                            borderRadius: 6,
                            background: 'white',
                            border: `0.5px solid ${BORDER}`,
                            color: TEXT_MUTED,
                            fontSize: 10,
                            cursor: 'pointer',
                            fontFamily: 'Arial, sans-serif',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                  {!dismissed && (
                    <input
                      placeholder="Add coach note for this issue..."
                      onChange={e =>
                        setOverride(issue.area, {
                          coachNote: e.target.value,
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 7,
                        border: `0.5px solid ${BORDER}`,
                        background: WARM_BG,
                        fontSize: 11,
                        color: TEXT,
                        fontFamily: 'Arial, sans-serif',
                        outline: 'none',
                      }}
                    />
                  )}
                </div>
              )
            })}

            {addedIssues.map(([key, o]) => (
              <div
                key={key}
                style={{
                  background: '#E6F1FB',
                  border: '0.5px solid #B5D4F4',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#185FA5',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: TEXT,
                    flex: 1,
                  }}
                >
                  {o.area}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: '#185FA5',
                    fontWeight: 600,
                  }}
                >
                  Coach added
                </span>
                <button
                  type="button"
                  onClick={() => undoOverride(key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: TEXT_MUTED,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {!newIssueOpen ? (
          <button
            type="button"
            onClick={() => setNewIssueOpen(true)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 10,
              background: 'white',
              border: `0.5px solid ${BORDER}`,
              color: TEXT_SEC,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            + Add issue Via missed
          </button>
        ) : (
          <div
            style={{
              background: WARM_BG,
              borderRadius: 12,
              padding: 14,
              border: `0.5px solid ${BORDER}`,
            }}
          >
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
              Describe what Via missed
            </div>
            <textarea
              value={newIssueText}
              onChange={e => setNewIssueText(e.target.value)}
              placeholder="e.g. Grip too tight on high balls..."
              style={{
                width: '100%',
                height: 70,
                padding: '9px 12px',
                borderRadius: 9,
                border: `0.5px solid ${BORDER}`,
                background: 'white',
                fontSize: 13,
                color: TEXT,
                fontFamily: 'Arial, sans-serif',
                resize: 'none',
                outline: 'none',
                marginBottom: 8,
              }}
            />
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {(['critical', 'moderate', 'minor'] as const).map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setNewIssueSeverity(sev)}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: 8,
                    background:
                      newIssueSeverity === sev
                        ? sev === 'critical'
                          ? '#FEF2F2'
                          : sev === 'moderate'
                            ? '#FFFBEB'
                            : WARM_BG
                        : 'white',
                    border: `${newIssueSeverity === sev ? '1.5px' : '0.5px'} solid ${
                      newIssueSeverity === sev
                        ? sev === 'critical'
                          ? RED
                          : sev === 'moderate'
                            ? AMBER
                            : BORDER
                        : BORDER
                    }`,
                    color:
                      newIssueSeverity === sev
                        ? sev === 'critical'
                          ? RED
                          : sev === 'moderate'
                            ? AMBER
                            : TEXT_MUTED
                        : TEXT_MUTED,
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: newIssueSeverity === sev ? 600 : 400,
                    textTransform: 'capitalize',
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button
                type="button"
                onClick={() => {
                  setNewIssueOpen(false)
                  setNewIssueText('')
                }}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 9,
                  background: 'white',
                  border: `0.5px solid ${BORDER}`,
                  color: TEXT_MUTED,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void addIssue()}
                disabled={!newIssueText.trim() || addingIssue}
                style={{
                  flex: 2,
                  padding: 9,
                  borderRadius: 9,
                  background: newIssueText.trim() ? TEAL : '#ccc',
                  border: 'none',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: newIssueText.trim() ? 'pointer' : 'default',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {addingIssue ? 'Adding...' : 'Add issue'}
              </button>
            </div>
          </div>
        )}

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 7,
            }}
          >
            Session note (optional)
          </div>
          <textarea
            value={coachNote}
            onChange={e => setCoachNote(e.target.value)}
            placeholder={`Add a note for ${firstName} about today...`}
            style={{
              width: '100%',
              height: 75,
              padding: '10px 12px',
              borderRadius: 10,
              border: `0.5px solid ${BORDER}`,
              background: WARM_BG,
              fontSize: 13,
              color: TEXT,
              fontFamily: 'Arial, sans-serif',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.6,
            }}
          />
        </div>

        {!verified ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => void handleVerify(true)}
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
              {saving
                ? 'Saving...'
                : pendingOverrides > 0
                  ? `Verify with ${pendingOverrides} edit${pendingOverrides !== 1 ? 's' : ''} + publish →`
                  : 'Looks good — verify + publish →'}
            </button>
            <button
              type="button"
              onClick={() => void handleVerify(false)}
              disabled={saving}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 12,
                background: 'white',
                border: `0.5px solid ${BORDER}`,
                color: TEXT_SEC,
                fontSize: 13,
                cursor: saving ? 'default' : 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Verify only — publish later
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: '#E1F5EE',
                border: '0.5px solid rgba(29,158,117,.25)',
                color: '#0F6E56',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              ✓ Verified
              {pendingOverrides > 0 &&
                ` · ${pendingOverrides} edit${pendingOverrides !== 1 ? 's' : ''} saved`}
            </div>
            {!published && (
              <button
                type="button"
                onClick={() => void handlePublishOnly()}
                disabled={publishing}
                style={{
                  width: '100%',
                  padding: 13,
                  borderRadius: 12,
                  background: publishing ? '#ccc' : TEXT,
                  border: 'none',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: publishing ? 'default' : 'pointer',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {publishing ? 'Publishing...' : `Publish to ${firstName} →`}
              </button>
            )}
            {published && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: WARM_BG,
                  border: `0.5px solid ${BORDER}`,
                  color: TEXT_SEC,
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Published to {firstName} ✓
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
