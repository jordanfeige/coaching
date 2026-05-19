'use client'

import { useRef, useState } from 'react'
import CoachChatPanel from '@/components/video/CoachChatPanel'
import FeedbackButtons from '@/components/FeedbackButtons'
import PoseOverlay from '@/components/PoseOverlay'
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
import { brand } from '@/lib/brand'
import PDFExportButton from '@/components/PDFExportButton'
import AnalysisQualityBadges from '@/components/AnalysisQualityBadges'
import type { PoseAnalysisResult } from '@/lib/poseAnalysis'

export function analysisPreviewHeadline(analysis: Record<string, unknown> | null | undefined): string {
  if (!analysis) return ''
  const h = analysis.session_headline
  if (typeof h === 'string' && h.trim()) return h.trim()
  const c = analysis.coach_tip
  if (typeof c === 'string' && c.trim()) return c.trim()
  const b = analysis.biggest_win
  if (typeof b === 'string' && b.trim()) return b.trim()
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

type TabKey = 'overview' | 'issues' | 'chat' | 'notes'
type AnalysisIssue = {
  area?: string
  severity?: string
  description?: string
  what_i_see?: string
  ideal?: string
  consequence?: string
  drill?: string
  drill_sets_reps?: string
  drill_instruction?: string
  success_criteria?: string
  simple_cue?: string
  drill_media_ref?: string
}
type AnalysisStrength = {
  area?: string
  description?: string
  what_i_see?: string
  why_it_helps?: string
}
type CoachingVideo = {
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
  description?: string
}

function tabBtn(active: boolean) {
  return cn(
    'flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
  )
}

function analysisScore(analysis: Record<string, unknown> | null | undefined) {
  const score = analysis?.overall_score
  if (typeof score === 'number') return score
  if (typeof score === 'string') return Number(score) || 0
  return 0
}

function analysisSessionId(analysis: Record<string, unknown> | null | undefined) {
  const sessionId = analysis?.sessionId ?? analysis?.session_id
  return typeof sessionId === 'string' && sessionId.trim() ? sessionId : undefined
}

function renderIssuesGrouped(
  issues: Array<AnalysisIssue | string>,
  coachingVideoControls?: {
    coachingVideos: Record<string, CoachingVideo[]>
    loadingCoachingVideo: string | null
    onFetchCoachingVideos: (issueArea: string, drill?: string) => void
  }
) {
  if (!issues?.length) return <p className="text-sm text-muted-foreground">No structured issues returned.</p>
  const bySev = ['critical', 'moderate', 'minor'] as const
  const labels = { critical: 'Critical', moderate: 'Moderate', minor: 'Minor' }
  const styles = {
    critical: {
      card: 'border-slate-200 border-l-4 border-l-destructive bg-white shadow-sm',
      text: 'text-destructive',
      body: 'text-slate-700',
      soft: 'border border-destructive/20 bg-destructive/5 text-destructive',
    },
    moderate: {
      card: 'border-slate-200 border-l-4 border-l-accent bg-white shadow-sm',
      text: 'text-slate-950',
      body: 'text-slate-700',
      soft: 'border border-accent/25 bg-accent/10 text-slate-900',
    },
    minor: {
      card: 'border-slate-200 border-l-4 border-l-primary bg-white shadow-sm',
      text: 'text-primary',
      body: 'text-slate-700',
      soft: 'border border-primary/20 bg-primary/10 text-primary',
    },
  }
  return (
    <div className="space-y-4">
      {bySev.map(sev => {
        const filtered = issues.filter(a => (typeof a === 'string' ? 'moderate' : a?.severity) === sev)
        if (!filtered.length) return null
        return (
          <div key={sev}>
            <p className={cn('mb-2 text-xs font-bold uppercase tracking-wide', styles[sev].text)}>
              {labels[sev]}
            </p>
            <div className="space-y-2">
              {filtered.map((issue, i) => {
                const detail = typeof issue === 'string' ? null : issue
                return (
                  <div key={i} className={cn('rounded-2xl border p-4', styles[sev].card)}>
                    <p className={cn('font-heading font-semibold', styles[sev].text)}>
                      {detail?.area || (typeof issue === 'string' ? issue : 'Technique issue')}
                    </p>
                    {detail && (
                      <div className={cn('mt-2 space-y-2 text-sm leading-relaxed', styles[sev].body)}>
                        {detail.description ? (
                          <p className="whitespace-pre-wrap">{detail.description}</p>
                        ) : (
                          <>
                            {detail.what_i_see && (
                              <p>
                                <span className="font-semibold text-slate-950">What I see: </span>
                                {detail.what_i_see}
                              </p>
                            )}
                            {detail.ideal && (
                              <p>
                                <span className="font-semibold text-slate-950">Ideal: </span>
                                {detail.ideal}
                              </p>
                            )}
                            {detail.consequence && (
                              <p>
                                <span className="font-semibold text-slate-950">Why it matters: </span>
                                {detail.consequence}
                              </p>
                            )}
                          </>
                        )}
                        {detail.simple_cue && (
                          <div className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', styles[sev].soft)}>
                            Cue: &quot;{detail.simple_cue}&quot;
                          </div>
                        )}
                      </div>
                    )}
                    {(detail?.drill || detail?.drill_sets_reps || detail?.drill_instruction || detail?.success_criteria) && (
                      <div className="mt-3 border-t border-border pt-3">
                        {detail.drill && (
                          <p className="font-heading text-sm font-semibold text-primary">Drill: {detail.drill}</p>
                        )}
                        {detail.drill_sets_reps && (
                          <p className="mt-1 text-xs font-semibold text-slate-950">{detail.drill_sets_reps}</p>
                        )}
                        {detail.drill_media_ref && (
                          <Badge variant="outline" className="mt-2">
                            Media: {detail.drill_media_ref}
                          </Badge>
                        )}
                        {detail.drill_instruction && (
                          <p className="mt-1 text-sm text-slate-700">{detail.drill_instruction}</p>
                        )}
                        {detail.success_criteria && (
                          <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-950">Success: </span>
                            {detail.success_criteria}
                          </p>
                        )}
                      </div>
                    )}
                    {detail?.area && coachingVideoControls && (
                      <div className="mt-3">
                        {coachingVideoControls.coachingVideos[detail.area]?.length ? (
                          <div className="space-y-2">
                            {coachingVideoControls.coachingVideos[detail.area].slice(0, 3).map(video => (
                              <a
                                key={video.videoId}
                                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl border p-2 transition-all hover:border-[#FF4444]"
                                style={{ background: brand.cardAlt, borderColor: brand.border }}
                              >
                                {video.thumbnail ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={video.thumbnail}
                                    alt=""
                                    width={120}
                                    height={68}
                                    className="h-[68px] w-[120px] shrink-0 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-[68px] w-[120px] shrink-0 items-center justify-center rounded-lg bg-black text-xs text-white">
                                    YouTube
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-[11px] font-semibold" style={{ color: brand.text }}>
                                    {video.title.length > 60 ? `${video.title.slice(0, 60)}...` : video.title}
                                  </p>
                                  <div className="mt-1 flex items-center gap-1">
                                    <svg width="13" height="9" viewBox="0 0 13 9" fill="none" aria-hidden="true">
                                      <rect width="13" height="9" rx="2" fill="#FF0000" />
                                      <path d="M5.2 2.2L8.8 4.5L5.2 6.8V2.2Z" fill="white" />
                                    </svg>
                                    <p className="truncate text-[10px]" style={{ color: brand.textMuted }}>
                                      {video.channelTitle}
                                    </p>
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={coachingVideoControls.loadingCoachingVideo === detail.area}
                            onClick={() => coachingVideoControls.onFetchCoachingVideos(detail.area!, detail.drill || '')}
                            className="mt-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-60"
                            style={{
                              background: '#FF000015',
                              color: '#FF4444',
                              border: '1px solid #FF000030',
                            }}
                          >
                            {coachingVideoControls.loadingCoachingVideo === detail.area
                              ? 'Searching...'
                              : '▶ Find coaching videos'}
                          </button>
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

function renderStrengths(strengths: AnalysisStrength[]) {
  if (!strengths.length) return null
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">Strengths</h4>
      <div className="mt-2 grid gap-2">
        {strengths.map((strength, i) => (
          <div key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary">{strength.area || 'Strength'}</p>
            {(strength.what_i_see || strength.description) && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {strength.what_i_see || strength.description}
              </p>
            )}
            {strength.why_it_helps && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Why it helps: </span>
                {strength.why_it_helps}
              </p>
            )}
          </div>
        ))}
      </div>
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
  mediaKind = 'video',
  analysis,
  videoId,
  lessonId,
  sport,
  shotType,
  playerName,
  playerEmail,
  coachingVideos,
  loadingCoachingVideo,
  onFetchCoachingVideos,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  recordedLabel: string
  videoUrl: string | null
  mediaKind?: 'image' | 'video'
  analysis: Record<string, unknown> | null
  videoId?: string | null
  lessonId?: string | null
  sport?: string | null
  shotType?: string | null
  playerName?: string | null
  playerEmail?: string | null
  coachingVideos?: Record<string, CoachingVideo[]>
  loadingCoachingVideo?: string | null
  onFetchCoachingVideos?: (issueArea: string, drill?: string) => void
}) {
  const [tab, setTab] = useState<TabKey>('overview')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [poseResult, setPoseResult] = useState<PoseAnalysisResult | null>(null)
  const [showPoseOverlay, setShowPoseOverlay] = useState(false)

  const isComparison = !!(analysis?.observations_old || analysis?.improvements)
  const savedSessionId = analysisSessionId(analysis)

  const bullets = Array.isArray(analysis?.overview_bullets)
    ? (analysis!.overview_bullets as string[]).filter(Boolean)
    : []

  const issuesList = [
    ...(Array.isArray(analysis?.areas_to_improve) ? analysis!.areas_to_improve : []),
    ...(Array.isArray(analysis?.still_needs_work) ? analysis!.still_needs_work : []),
  ]

  return (
    <>
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
                <div className="mb-4 overflow-hidden rounded-xl border border-border bg-black">
                  {mediaKind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={videoUrl} alt={title || 'Analysis media'} className="max-h-[520px] w-full object-contain" />
                  ) : (
                    <>
                      <div className="relative">
                        <video ref={videoRef} src={videoUrl} controls playsInline className="max-h-[520px] w-full bg-black" />
                        <PoseOverlay
                          videoRef={videoRef}
                          sport={sport || 'tennis'}
                          show={showPoseOverlay}
                          onMeasurementsReady={result => {
                            setPoseResult(result)
                            console.log('Coach pose measurements:', result.measurements)
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-border bg-white px-3.5 py-2.5">
                        <span className="text-[11px] text-muted-foreground">
                          {poseResult
                            ? `${poseResult.measurements.length} joint measurements captured`
                            : 'Show pose overlay to capture exact joint angles'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPoseOverlay(!showPoseOverlay)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: '1px solid hsl(30,10%,88%)',
                            background: showPoseOverlay ? 'hsl(168,62%,95%)' : 'white',
                            color: showPoseOverlay ? 'hsl(168,62%,36%)' : 'hsl(220,10%,55%)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Arial, sans-serif',
                          }}
                        >
                          {showPoseOverlay ? 'Hide pose overlay' : 'Show pose overlay'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
                <button type="button" className={tabBtn(tab === 'overview')} onClick={() => setTab('overview')}>
                  Overview
                </button>
                <button type="button" className={tabBtn(tab === 'issues')} onClick={() => setTab('issues')}>
                  Issues & drills
                </button>
                <button type="button" className={tabBtn(tab === 'chat')} onClick={() => setTab('chat')}>
                  Ask AI
                </button>
                <button type="button" className={tabBtn(tab === 'notes')} onClick={() => setTab('notes')}>
                  Full notes
                </button>
              </div>

              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <AnalysisQualityBadges
                      rating={
                        typeof analysis.overall_rating === 'string'
                          ? analysis.overall_rating
                          : null
                      }
                      confidence={
                        typeof analysis.confidence === 'string'
                          ? analysis.confidence
                          : null
                      }
                    />
                    {isComparison && (
                      <Badge variant="outline">Comparison</Badge>
                    )}
                    {analysis.ai_coach_enhanced === true && (
                      <Badge variant="outline">AI coach explanation</Badge>
                    )}
                    {analysis.ai_coach_enhanced === false && (
                      <Badge variant="secondary">Local fallback</Badge>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderTop: '1px solid hsl(30,10%,88%)',
                      borderBottom: '1px solid hsl(30,10%,88%)',
                      margin: '12px 0',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: 'hsl(220,10%,55%)',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      Was this analysis helpful?
                    </span>
                    <FeedbackButtons
                      sessionId={savedSessionId}
                      feedbackType="analysis"
                      sport={sport || undefined}
                      shotType={shotType || undefined}
                      fullAnalysis={analysis}
                      size="md"
                    />
                  </div>

                  <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
                    <div className="mb-3">
                      <h4 className="font-heading text-sm font-semibold text-foreground">Ask Coach AI</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ask a follow-up question about this analysis while the report is fresh.
                      </p>
                    </div>
                    <CoachChatPanel
                      videoId={videoId}
                      lessonId={lessonId}
                      sport={sport}
                      disabled={!videoId && !lessonId}
                    />
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

                  {typeof analysis.observations === 'string' && analysis.observations.trim() && (
                    <details className="rounded-xl border border-border bg-muted/30 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-foreground">
                        See full frame-by-frame breakdown ▾
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {analysis.observations}
                      </p>
                    </details>
                  )}

                  {typeof analysis.technique_notes === 'string' && analysis.technique_notes.trim() && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Technique notes</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {analysis.technique_notes}
                      </p>
                    </div>
                  )}

                  {typeof analysis.biggest_win === 'string' && analysis.biggest_win.trim() && (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
                      <p className="text-sm font-semibold text-primary">Biggest win</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{analysis.biggest_win}</p>
                    </div>
                  )}

                  {Array.isArray(analysis.strengths) &&
                    renderStrengths(analysis.strengths as AnalysisStrength[])}

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
                    <div className="grid gap-3">
                      {typeof analysis.coach_tip === 'string' && analysis.coach_tip.trim() && (
                        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                          <p className="text-sm">
                            <span className="font-semibold text-foreground">Coach cue: </span>
                            <span className="text-muted-foreground">{analysis.coach_tip}</span>
                          </p>
                        </div>
                      )}
                      {typeof analysis.priority_focus === 'string' && analysis.priority_focus.trim() && (
                        <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-3">
                          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">This week&apos;s focus</p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{analysis.priority_focus}</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                </div>
              )}

              {tab === 'issues' && (
                <div className="space-y-5">
                  {renderIssuesGrouped(
                    issuesList as Array<AnalysisIssue | string>,
                    coachingVideos && onFetchCoachingVideos
                      ? {
                          coachingVideos,
                          loadingCoachingVideo: loadingCoachingVideo ?? null,
                          onFetchCoachingVideos,
                        }
                      : undefined
                  )}
                  {renderRecommendedDrills(analysis)}
                </div>
              )}

              {tab === 'chat' && (
                <CoachChatPanel
                  videoId={videoId}
                  lessonId={lessonId}
                  sport={sport}
                  disabled={!videoId && !lessonId}
                />
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
                  {typeof analysis.ai_coach_error === 'string' && analysis.ai_coach_error.trim() && (
                    <section className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-3">
                      <h4 className="mb-1 font-semibold text-foreground">AI coach note</h4>
                      <p className="whitespace-pre-wrap">{analysis.ai_coach_error}</p>
                    </section>
                  )}
                  {Array.isArray(analysis.strengths) && analysis.strengths.length > 0 && (
                    <section>
                      <h4 className="mb-1 font-semibold text-foreground">Strengths</h4>
                      <ul className="space-y-2">
                        {(analysis.strengths as { area?: string; description?: string; what_i_see?: string; why_it_helps?: string }[]).map((s, i) => (
                          <li key={i}>
                            <span className="font-medium text-foreground">{s.area}</span>
                            {(s.description || s.what_i_see) && (
                              <span className="mt-0.5 block">{s.description || s.what_i_see}</span>
                            )}
                            {s.why_it_helps && (
                              <span className="mt-0.5 block">
                                <span className="font-semibold text-foreground">Why it helps: </span>
                                {s.why_it_helps}
                              </span>
                            )}
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-5 py-3">
          {analysis ? (
            <PDFExportButton
              analysis={analysis}
              playerName={playerName || 'Athlete'}
              sport={sport || 'tennis'}
              shotType={shotType || undefined}
              overallScore={analysisScore(analysis)}
              playerEmail={playerEmail || undefined}
            />
          ) : (
            <div />
          )}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
