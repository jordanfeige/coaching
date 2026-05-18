import Link from 'next/link'
import { SmartBrandMark } from '@/components/brand/SmartBrandMark'

const teal = 'hsl(168, 62%, 36%)'
const tealSoft = 'hsl(168, 62%, 95%)'
const tealBorder = 'hsl(168, 62%, 80%)'
const warmBg = 'hsl(40, 20%, 97%)'
const warmBorder = 'hsl(30, 10%, 88%)'
const textPrimary = 'hsl(220, 20%, 15%)'
const textSecondary = 'hsl(220, 10%, 45%)'

const analyzerFeatures = [
  'Instant AI video analysis',
  'Tennis, Golf, Pickleball, Baseball & Basketball',
  'Specific drill recommendations',
  'YouTube coaching videos',
  'Shareable results',
]

const coachFeatures = [
  'Player roster management',
  'Lesson scheduling & calendar',
  'AI drill builder',
  'Video analysis for all players',
  'Player invite system',
]

const playerFeatures = [
  'View lessons & assigned drills',
  'AI video analysis',
  'Progress tracking',
  'Coach matching (coming soon)',
  'Works without a coach too',
]

const sports = [
  {
    emoji: '🎾',
    title: 'Tennis',
    issues: 'Grip · Swing path · Contact point · Footwork · Follow through',
  },
  {
    emoji: '⛳',
    title: 'Golf',
    issues: 'Backswing plane · Hip rotation · Lag · Impact · Follow through',
  },
  {
    emoji: '⚾',
    title: 'Baseball',
    issues: 'Load position · Hip rotation · Bat path · Extension',
  },
  {
    emoji: '🏀',
    title: 'Basketball',
    issues: 'Shot pocket · Elbow alignment · Release point · Follow through',
  },
  {
    emoji: '🏓',
    title: 'Pickleball',
    issues: 'Kitchen play · Dinks · Volleys · Third shot drops · Doubles positioning',
  },
]

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {features.map(feature => (
        <li key={feature} className="flex gap-2 text-sm" style={{ color: textSecondary }}>
          <span className="font-bold" style={{ color: teal }}>✓</span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

function TealButton({ href, children, large = false }: { href: string; children: React.ReactNode; large?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-2xl font-bold text-white transition-colors ${
        large ? 'px-8 py-4 text-lg' : 'px-4 py-3 text-sm'
      }`}
      style={{ background: teal }}
    >
      {children}
    </Link>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: warmBg, color: textPrimary }}>
      <nav
        className="sticky top-0 z-50 bg-white/95 px-5 py-4 backdrop-blur"
        style={{ borderBottom: `1px solid ${warmBorder}` }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <SmartBrandMark variant="sidebar" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold" style={{ color: teal }}>
              Sign in
            </Link>
            <Link
              href="/analyze"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: teal }}
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto max-w-3xl px-5 py-24 text-center">
          <div
            className="mb-6 inline-flex rounded-full border px-4 py-1 text-xs font-semibold"
            style={{ background: tealSoft, color: teal, borderColor: tealBorder }}
          >
            AI Coaching for Modern Athletes
          </div>
          <h1 className="font-heading text-5xl leading-tight font-black md:text-6xl">
            Improve faster with
            <br />
            AI-powered coaching.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-xl leading-relaxed" style={{ color: textSecondary }}>
            Upload a video of your technique. Get instant analysis, personalized drills, and coaching resources — for any sport.
          </p>
          <div className="mt-8">
            <Link
              href="/analyze"
              className="inline-block rounded-2xl px-8 py-4 text-lg font-bold text-white transition-colors"
              style={{ background: teal }}
            >
              Analyze your technique free →
            </Link>
          </div>
          <p className="mt-3 text-sm" style={{ color: textSecondary }}>
            No credit card required · Tennis · Golf · Pickleball · Baseball · Basketball
          </p>
        </section>

        <section className="mx-auto mt-20 max-w-5xl px-5">
          <p className="mb-8 text-center text-sm font-medium" style={{ color: textSecondary }}>
            Choose how you&apos;d like to get started
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-sm" style={{ border: `2px solid ${teal}` }}>
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: tealSoft, color: teal }}>
                Most popular
              </span>
              <div className="mt-5 mb-4 text-4xl">🎯</div>
              <h2 className="text-xl font-bold">Free Technique Analyzer</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: textSecondary }}>
                Upload any sports video and get instant AI coaching feedback. No account needed to get started.
              </p>
              <FeatureList features={analyzerFeatures} />
              <Link href="/analyze" className="mt-6 flex w-full justify-center rounded-xl py-3 font-semibold text-white" style={{ background: teal }}>
                Start analyzing free →
              </Link>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm" style={{ border: `1px solid ${warmBorder}` }}>
              <div className="mb-4 text-4xl">📋</div>
              <h2 className="text-xl font-bold">I&apos;m a Coach</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: textSecondary }}>
                Manage your roster, schedule lessons, assign AI-generated drills, and track every player&apos;s progress.
              </p>
              <FeatureList features={coachFeatures} />
              <Link href="/signup?role=coach" className="mt-6 flex w-full justify-center rounded-xl border py-3 font-semibold" style={{ color: teal, borderColor: teal }}>
                Set up coaching account →
              </Link>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm" style={{ border: `1px solid ${warmBorder}` }}>
              <div className="mb-4 text-4xl">🏃</div>
              <h2 className="text-xl font-bold">I&apos;m a Player or Parent</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: textSecondary }}>
                Join your coach&apos;s team or create a free account to analyze your technique and track your progress over time.
              </p>
              <FeatureList features={playerFeatures} />
              <Link href="/signup?role=player" className="mt-6 flex w-full justify-center rounded-xl border py-3 font-semibold" style={{ color: teal, borderColor: teal }}>
                Create player account →
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20 border-t px-5 py-24" style={{ borderColor: warmBorder, background: warmBg }}>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-3xl font-bold">How it works</h2>
            <p className="mt-3 text-sm" style={{ color: textSecondary }}>Get your first coaching report in under 60 seconds</p>
            <div className="mt-12 grid grid-cols-1 gap-12 text-left md:grid-cols-3">
              {[
                ['1', 'Record & upload', 'Film yourself playing from the side or front. Any phone camera works — even a 30-second clip is enough.'],
                ['2', 'AI analyzes your technique', 'Our AI watches your full motion and identifies specific issues with measurements, timestamps, and biomechanical explanations.'],
                ['3', 'Get your coaching report', 'Receive a detailed breakdown with severity ratings, specific drills, YouTube coaching videos, and simple on-court cues you can use today.'],
              ].map(([number, title, description]) => (
                <div key={number}>
                  <div className="flex size-10 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: teal }}>
                    {number}
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: textSecondary }}>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t px-5 py-24" style={{ borderColor: warmBorder }}>
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-heading text-3xl font-bold">Built for your sport</h2>
            <p className="mt-3" style={{ color: textSecondary }}>Specialized AI analysis for every game</p>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
              {sports.map(sport => (
                <Link
                  key={sport.title}
                  href="/analyze"
                  className="rounded-2xl bg-white p-6 text-center transition-all hover:border-primary"
                  style={{ border: `1px solid ${warmBorder}` }}
                >
                  <div className="text-4xl">{sport.emoji}</div>
                  <h3 className="mt-4 font-bold">{sport.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: textSecondary }}>{sport.issues}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-white px-5 py-24 text-center" style={{ borderColor: warmBorder }}>
          <h2 className="font-heading text-4xl font-black">Ready to improve your game?</h2>
          <p className="mt-3" style={{ color: textSecondary }}>Join athletes already using Playvia to train smarter</p>
          <div className="mt-8">
            <TealButton href="/analyze" large>Analyze your technique free →</TealButton>
          </div>
          <p className="mt-3 text-sm" style={{ color: textSecondary }}>Free to start · No credit card required</p>
        </section>
      </main>

      <footer className="border-t bg-white px-5 py-8" style={{ borderColor: warmBorder }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 md:flex-row">
          <SmartBrandMark variant="sidebar" />
          <p className="text-sm" style={{ color: textSecondary }}>AI Coaching for Modern Athletes</p>
          <div className="flex items-center gap-4">
            {[
              ['Analyze', '/analyze'],
              ['Pricing', '/pricing'],
              ['Sign in', '/login'],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="text-sm hover:text-primary" style={{ color: textSecondary }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}