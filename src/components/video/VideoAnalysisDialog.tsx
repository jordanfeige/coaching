'use client'

import { useState } from 'react'
import AnnotatedFrame from '@/components/AnnotatedFrame'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function analysisPreviewHeadline(analysis: Record<string, unknown> | null | undefined): string {
  if (!analysis) return ''
  const h = analysis.session_headline
  if (typeof h === 'string' && h.trim()) return h.trim()
  const c = analysis.coach_tip
  if (typeof c === 'string' && c.trim()) return c.trim()
  const p = analysis.priority_focus
  if (typeof p === 'string' && p.trim()) return p.trim()
  return ''
}

export function issueSeverityCounts(analysis: Record<string, unknown> | null | undefined) {
  const lists = [
    ...(Array.isArray(analysis?.areas_to_improve) ? analysis!.areas_to_improve : []),
    ...(Array.isArray(analysis?.still_needs_work) ? analysis!.still_needs_work : []),
  ] as { severity?: string }[]
  let critical = 0
  let moderate = 0
  let minor = 0
  for (const item of lists) {
    const s = typeof item === 'string' ? 'moderate' : String(item?.severity || 'moderate')
    if (s === 'critical') critical++
    else if (s === 'moderate') moderate++
    else minor++
  }
  return { critical, moderate, minor, total: lists.length }
}

type TabKey = 'overview' | 'issues' | 'notes'
type FramePreview = { index: number; timestamp?: number; dataUrl: string }
type AnalysisIssue = {
  area?: string
  severity?: string
  description?: string
  drill?: string
  drill_instruction?: string
  drill_media_ref?: string
}
type AnalysisAnnotation = {
  frame_index?: number
  label: string
  issue: 'good' | 'warning' | 'error'
  x: number
  y: number
  note: string
}

function tabBtn(active: boolean) {
  return cn(
    'flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
  )
}

function confidenceVariant(c: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (c === 'high') return 'default'
  if (c === 'medium') return 'secondary'
  return 'destructive'
}

function renderIssuesGrouped(issues: Array<AnalysisIssue | string>) {
  if (!issues?.length) return <p className="text-sm text-muted-foreground">No structured issues returned.</p>
  const bySev = ['critical', 'moderate', 'minor'] as const
  const labels = { critical: 'Critical', moderate: 'Moderate', minor: 'Minor' }
  const ring = {
    critical: 'border-destructive/30 bg-destructive/5',
    moderate: 'border-amber-500/35 bg-amber-500/8',
    minor: 'border-primary/25 bg-primary/5',
  }
  return (
    <div className="space-y-4">
      {bySev.map(sev => {
        const filtered = issues.filter(a => (typeof a === 'string' ? 'moderate' : a?.severity) === sev)
        if (!filtered.length) return null
        return (
          <div key={sev}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{labels[sev]}</p>
            <div className="space-y-2">
              {filtered.map((issue, i) => {
                const detail = typeof issue === 'string' ? null : issue
                return (
                  <div key={i} className={cn('rounded-lg border p-3', ring[sev])}>
                    <p className="font-semibold text-foreground">
                      {detail?.area || (typeof issue === 'string' ? issue : 'Technique issue')}
                    </p>
                    {detail?.description && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail.description}</p>
                    )}
                    {(detail?.drill || detail?.drill_instruction) && (
                      <div className="mt-3 border-t border-border pt-3">
                        {detail.drill && (
                          <p className="text-sm font-semibold text-primary">Drill: {detail.drill}</p>
                        )}
                        {detail.drill_media_ref && (
                          <Badge variant="outline" className="mt-2">
                            Media: {detail.drill_media_ref}
                          </Badge>
                        )}
                        {detail.drill_instruction && (
                          <p className="mt-1 text-sm text-muted-foreground">{detail.drill_instruction}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function renderRecommendedDrills(analysis: Record<string, unknown>) {
  const drills = Array.isArray(analysis.recommended_drills) ? analysis.recommended_drills : []
  if (!drills.length) return null
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">Recommended drill media</h4>
      <div className="grid gap-2">
        {(drills as Array<{ title?: string; focus?: string; description?: string; media_ref?: string }>).map((drill, i) => (
          <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{drill.title || 'Recommended drill'}</p>
              {drill.media_ref && <Badge variant="outline">{drill.media_ref}</Badge>}
            </div>
            {drill.focus && <p className="mt-1 text-xs font-medium text-primary">{drill.focus}</p>}
            {drill.description && <p className="mt-1 text-sm text-muted-foreground">{drill.description}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function VideoAnalysisDialog({
  open,
  onOpenChange,
  title,
  recordedLabel,
  videoUrl,
  analysis,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  recordedLabel: string
  videoUrl: string | null
  analysis: Record<string, unknown> | null
}) {
  const [tab, setTab] = useState<TabKey>('overview')

  const isComparison = !!(analysis?.observations_old || analysis?.improvements)

  const bullets = Array.isArray(analysis?.overview_bullets)
    ? (analysis!.overview_bullets as string[]).filter(Boolean)
    : []

  const issuesList = [
    ...(Array.isArray(analysis?.areas_to_improve) ? analysis!.areas_to_improve : []),
    ...(Array.isArray(analysis?.still_needs_work) ? analysis!.still_needs_work : []),
  ]

  const annotations =
    Array.isArray(analysis?.annotations)
      ? (analysis!.annotations as AnalysisAnnotation[])
      : []
  const framePreviews = Array.isArray(analysis?.frame_previews)
    ? (analysis!.frame_previews as FramePreview[])
    : []
  const keyFrames = Array.isArray(analysis?.key_frames)
    ? (analysis!.key_frames as Array<{ frame_index?: number; timestamp_label?: string; reason?: string }>)
    : []
  const displayedFrames =
    keyFrames.length > 0
      ? framePreviews.filter(frame => keyFrames.some(k => k.frame_index === frame.index))
      : framePreviews.slice(0, 4)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,920px)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="pr-8 text-lg">{title || 'Analysis'}</DialogTitle>
          <DialogDescription>{recordedLabel}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!analysis ? (
            <p className="text-sm text-muted-foreground">Run analysis to see coaching feedback.</p>
          ) : (
            <>
              {videoUrl && (
                <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                  <video src={videoUrl} controls playsInline className="w-full rounded-lg bg-black" />
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">Annotated key frames</h4>
                      {framePreviews.length > 0 && (
                        <Badge variant="secondary">{framePreviews.length} frames analyzed</Badge>
                      )}
                    </div>
                    {displayedFrames.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Run frame-based analysis to see key frames.</p>
                    ) : (
                      <div className="grid gap-3">
                        {displayedFrames.map(frame => {
                          const frameAnnotations = annotations.filter(a => (a.frame_index ?? frame.index) === frame.index)
                          const key = keyFrames.find(k => k.frame_index === frame.index)
                          return (
                            <div key={frame.index} className="space-y-2">
                              {frameAnnotations.length > 0 ? (
                                <AnnotatedFrame
                                  imageUrl={frame.dataUrl}
                                  annotations={frameAnnotations}
                                  className="overflow-hidden rounded-lg"
                                />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={frame.dataUrl} alt={`Frame ${frame.index}`} className="w-full rounded-lg" />
                              )}
                              <p className="text-xs text-muted-foreground">
                                Frame {frame.index}
                                {typeof frame.timestamp === 'number' ? ` · ${frame.timestamp.toFixed(1)}s` : ''}
                                {key?.reason ? ` · ${key.reason}` : ''}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
                <button type="button" className={tabBtn(tab === 'overview')} onClick={() => setTab('overview')}>
                  Overview
                </button>
                <button type="button" className={tabBtn(tab === 'issues')} onClick={() => setTab('issues')}>
                  Issues & drills
                </button>
                <button type="button" className={tabBtn(tab === 'notes')} onClick={() => setTab('notes')}>
                  Full notes
                </button>
              </div>

              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {typeof analysis.overall_rating === 'string' && (
                      <Badge variant="secondary">{analysis.overall_rating}</Badge>
                    )}
                    {typeof analysis.confidence === 'string' && (
                      <Badge variant={confidenceVariant(analysis.confidence)}>
                        {analysis.confidence} confidence
                      </Badge>
                    )}
                    {isComparison && (
                      <Badge variant="outline">Comparison</Badge>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Session summary</h4>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {(() => {
                        const s =
                          analysis.session_headline ?? analysis.progress_summary ?? analysis.coach_tip
                        const t = typeof s === 'string' ? s.trim() : ''
                        return t || 'See full notes for detail.'
                      })()}
                    </p>
                  </div>

                  {bullets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Quick takeaways</h4>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(analysis.improvements) && analysis.improvements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Progress since baseline</h4>
                      <ul className="mt-2 space-y-2">
                        {(analysis.improvements as { area?: string; description?: string }[]).map((imp, i) => (
                          <li key={i} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                            <span className="font-medium text-foreground">{imp.area}</span>
                            {imp.description && (
                              <span className="mt-0.5 block text-muted-foreground">{imp.description}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {((typeof analysis.coach_tip === 'string' && analysis.coach_tip.trim()) ||
                    (typeof analysis.priority_focus === 'string' && analysis.priority_focus.trim())) ? (
                    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                      {typeof analysis.coach_tip === 'string' && analysis.coach_tip.trim() && (
                        <p className="text-sm">
                          <span className="font-semibold text-foreground">Coach cue: </span>
                          <span className="text-muted-foreground">{analysis.coach_tip}</span>
                        </p>
                      )}
                      {typeof analysis.priority_focus === 'string' && analysis.priority_focus.trim() && (
                        <p className="mt-2 text-sm">
                          <span className="font-semibold text-foreground">Priority: </span>
                          <span className="text-muted-foreground">{analysis.priority_focus}</span>
                        </p>
                      )}
                    </div>
                  ) : null}

                  {annotations.length > 0 && framePreviews.length === 0 && videoUrl && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-foreground">Key frame cues</h4>
                      <AnnotatedFrame videoUrl={videoUrl} annotations={annotations} className="max-h-72 w-full overflow-hidden rounded-lg" />
                    </div>
                  )}
                </div>
              )}

              {tab === 'issues' && (
                <div className="space-y-5">
                  {renderIssuesGrouped(issuesList as Array<AnalysisIssue | string>)}
                  {renderRecommendedDrills(analysis)}
                </div>
              )}

              {tab === 'notes' && (
                <article className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                  {typeof analysis.observations === 'string' && analysis.observations.trim() && (
                    <section>
                      <h4 className="mb-1 font-semibold text-foreground">Observations</h4>
                      <p className="whitespace-pre-wrap">{analysis.observations}</p>
                    </section>
                  )}
                  {typeof analysis.observations_old === 'string' && analysis.observations_old.trim() && (
                    <section>
                      <h4 className="mb-1 font-semibold text-foreground">Older clip</h4>
                      <p className="whitespace-pre-wrap">{analysis.observations_old}</p>
                    </section>
                  )}
                  {typeof analysis.observations_new === 'string' && analysis.observations_new.trim() && (
                    <section>
                      <h4 className="mb-1 font-semibold text-foreground">Newer clip</h4>
                      <p className="whitespace-pre-wrap">{analysis.observations_new}</p>
                    </section>
                  )}
                  {typeof analysis.technique_notes === 'string' && analysis.technique_notes.trim() && (
                    <section>
                      <h4 className="mb-1 font-semibold text-foreground">Technique notes</h4>
                      <p className="whitespace-pre-wrap">{analysis.technique_notes}</p>
                    </section>
                  )}
                  {Array.isArray(analysis.strengths) && analysis.strengths.length > 0 && (
                    <section>
                      <h4 className="mb-1 font-semibold text-foreground">Strengths</h4>
                      <ul className="space-y-2">
                        {(analysis.strengths as { area?: string; description?: string }[]).map((s, i) => (
                          <li key={i}>
                            <span className="font-medium text-foreground">{s.area}</span>
                            {s.description && <span className="mt-0.5 block">{s.description}</span>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </article>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-border bg-muted/40 px-5 py-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
