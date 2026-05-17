import Link from 'next/link'
import { SmartBrandMark } from '@/components/brand/SmartBrandMark'
import { WaitlistForm } from '@/components/waitlist/WaitlistForm'

const features = [
  'Unlimited technique analysis',
  'Progress history and share links',
  'Sport-specific coaching videos',
  'Priority access to new AI coaching tools',
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/95 px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <SmartBrandMark variant="sidebar" />
          <div className="flex items-center gap-2">
            <Link href="/analyze" className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary">
              Analyze
            </Link>
            <Link href="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-5 py-14">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Pricing</p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight md:text-6xl">
            Pro tools for athletes who want to improve faster.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Playvia Pro is launching soon with deeper analysis history, progress tracking, and premium coaching workflows.
          </p>
        </section>

        <section className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <p className="font-heading text-2xl font-bold">Free</p>
            <p className="mt-2 text-sm text-muted-foreground">Try video analysis and get a coaching report.</p>
            <p className="mt-6 font-heading text-4xl font-bold">$0</p>
            <Link href="/analyze" className="mt-6 inline-flex w-full justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:border-primary">
              Analyze a video
            </Link>
          </div>

          <div className="rounded-3xl border border-primary/30 bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-2xl font-bold">Pro</p>
                <p className="mt-2 text-sm text-muted-foreground">Early access for serious athletes and families.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Soon</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {features.map(feature => (
                <li key={feature} className="flex gap-2">
                  <span className="font-bold text-primary">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <WaitlistForm source="pricing" />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
