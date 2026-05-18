import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type AnalysisIssue = {
  area?: string
  severity?: 'critical' | 'moderate' | 'minor'
  what_i_see?: string
  ideal?: string
  consequence?: string
  drill?: string
  drill_sets_reps?: string
  drill_instruction?: string
  success_criteria?: string
  simple_cue?: string
}

type AnalysisStrength = {
  area?: string
  what_i_see?: string
  why_it_helps?: string
}

type AnalysisResult = {
  observations?: string
  technique_notes?: string
  strengths?: AnalysisStrength[]
  areas_to_improve?: AnalysisIssue[]
  overall_rating?: string
  biggest_win?: string
  priority_focus?: string
  confidence?: string
}

type AnalysisRow = {
  id: string
  sport: string
  shot_type: string | null
  athlete_name: string | null
  rating: string | null
  top_issue: string | null
  result: AnalysisResult
  created_at: string
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playvia.studio'

export const dynamic = 'force-dynamic'

async function getAnalysis(id: string): Promise<AnalysisRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('id, sport, shot_type, athlete_name, rating, top_issue, result, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) return null
  return data as AnalysisRow | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const analysis = await getAnalysis(id)
  if (!analysis) return { title: 'Analysis not found | Playvia' }

  const ogUrl = `${siteUrl}/api/og?sport=${encodeURIComponent(analysis.sport)}&rating=${encodeURIComponent(
    analysis.rating || 'Technique report'
  )}&topIssue=${encodeURIComponent(analysis.top_issue || 'Technique report')}&name=${encodeURIComponent(
    analysis.athlete_name || 'Athlete'
  )}`

  return {
    title: `${analysis.top_issue || 'Technique report'} | Playvia`,
    description: 'AI-powered coaching feedback from Playvia.',
    openGraph: {
      title: `${analysis.top_issue || 'Technique report'} | Playvia`,
      description: 'AI-powered coaching feedback from Playvia.',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${analysis.top_issue || 'Technique report'} | Playvia`,
      description: 'AI-powered coaching feedback from Playvia.',
      images: [ogUrl],
    },
  }
}

function severityClass(severity?: string) {
  if (severity === 'critical') return 'border-l-destructive'
  if (severity === 'minor') return 'border-l-primary'
  return 'border-l-accent'
}

export default async function PublicAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const analysis = await getAnalysis(id)
  if (!analysis) notFound()

  const result = analysis.result

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-10">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {result.overall_rating && (
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                {result.overall_rating}
              </span>
            )}
            {result.confidence && (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                {result.confidence} confidence
              </span>
            )}
            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
              {analysis.sport}
            </span>
          </div>

          <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight md:text-5xl">
            {analysis.top_issue || 'Technique report'}
          </h1>

          {result.observations && (
            <details className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <summary className="cursor-pointer font-heading text-sm font-semibold text-foreground">
                See full frame-by-frame breakdown ▾
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{result.observations}</p>
            </details>
          )}

          {result.technique_notes && (
            <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
              <h2 className="font-heading text-sm font-semibold text-foreground">Technique notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{result.technique_notes}</p>
            </div>
          )}
        </section>

        {result.biggest_win && (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
            <p className="font-heading text-sm font-bold uppercase tracking-wide text-primary">Biggest win</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">{result.biggest_win}</p>
          </section>
        )}

        {!!result.strengths?.length && (
          <section>
            <h2 className="mb-3 font-heading text-xl font-semibold">Strengths</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {result.strengths.map((strength, index) => (
                <div key={index} className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="font-semibold text-primary">{strength.area || 'Strength'}</p>
                  {strength.what_i_see && <p className="mt-2 text-sm text-foreground/80">{strength.what_i_see}</p>}
                  {strength.why_it_helps && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Why it helps: </span>{strength.why_it_helps}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {!!result.areas_to_improve?.length && (
          <section>
            <h2 className="mb-3 font-heading text-xl font-semibold">Issues to fix</h2>
            <div className="space-y-3">
              {result.areas_to_improve.map((issue, index) => (
                <div key={`${issue.area || 'issue'}-${index}`} className={`rounded-2xl border border-l-4 bg-white p-4 text-slate-900 ${severityClass(issue.severity)}`}>
                  <p className="font-heading font-semibold">{issue.area || `Issue ${index + 1}`}</p>
                  <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
                    {issue.what_i_see && <p><span className="font-semibold text-slate-950">What I see: </span>{issue.what_i_see}</p>}
                    {issue.ideal && <p><span className="font-semibold text-slate-950">Ideal: </span>{issue.ideal}</p>}
                    {issue.consequence && <p><span className="font-semibold text-slate-950">Why it matters: </span>{issue.consequence}</p>}
                    {issue.simple_cue && <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-slate-950">Cue: &quot;{issue.simple_cue}&quot;</span>}
                  </div>
                  {(issue.drill || issue.drill_instruction || issue.success_criteria) && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      {issue.drill && <p className="font-heading text-sm font-semibold text-emerald-700">Drill: {issue.drill}</p>}
                      {issue.drill_sets_reps && <p className="mt-1 text-xs font-semibold">{issue.drill_sets_reps}</p>}
                      {issue.drill_instruction && <p className="mt-1 text-sm text-slate-700">{issue.drill_instruction}</p>}
                      {issue.success_criteria && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold">Success: </span>{issue.success_criteria}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-primary/20 bg-primary/[0.06] p-6 text-center">
          <h2 className="font-heading text-2xl font-bold">Want your own report?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Upload a practice video and get personalized AI coaching feedback in minutes.
          </p>
          <Link href="/analyze" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
            Get your free analysis →
          </Link>
        </section>
      </main>
    </div>
  )
}
