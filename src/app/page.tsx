import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'

const teal = 'hsl(168, 62%, 36%)'
const tealSoft = 'hsl(168, 62%, 95%)'
const warmBg = 'hsl(40, 20%, 97%)'
const warmBorder = 'hsl(30, 10%, 88%)'
const textPrimary = 'hsl(220, 20%, 15%)'
const textSecondary = 'hsl(220, 10%, 45%)'

const sports = [
  ['🎾', 'Tennis', 'Grip · Swing path · Contact · Footwork'],
  ['⛳', 'Golf', 'Backswing · Hip rotation · Lag · Impact'],
  ['⚾', 'Baseball', 'Load · Hip rotation · Bat path · Extension'],
  ['🏀', 'Basketball', 'Shot pocket · Elbow · Release · Follow through'],
  ['🏓', 'Pickleball', 'Kitchen game · Dinking · Third shot · Positioning'],
]

const steps = [
  ['1', '📹', 'Record yourself', 'Film a 30-second clip of your technique on your phone'],
  ['2', '🤖', 'AI analyzes your motion', 'Gemini AI watches your full video and scores every aspect of your technique with timestamp references'],
  ['3', '📊', 'Get your score', 'Receive a 0-100 technique score with specific issues ranked by severity, drills to fix each one, and coaching videos'],
  ['4', '📈', 'Track progress over time', "Every session is saved. Watch your score improve week by week. See exactly which issues you've fixed and which need more work."],
]

const pricingCards = [
  {
    name: 'Free',
    monthlyPrice: '$0',
    annualPrice: '$0',
    annualNote: 'Always free',
    subtitle: 'Get started',
    href: '/signup',
    button: 'Start free →',
    features: [
      ['✓', 'Sign up required'],
      ['✓', '3 AI analyses included'],
      ['✓', 'Full coaching report each time'],
      ['✓', 'Ask Coach AI'],
      ['✓', 'YouTube coaching videos'],
      ['✗', 'Progress timeline'],
      ['✗', 'Score history'],
      ['✗', 'Unlimited analyses'],
    ],
  },
  {
    name: 'Pro',
    monthlyPrice: '$12/mo',
    annualPrice: '$99/yr',
    annualNote: 'or $99 billed yearly',
    subtitle: 'Track your improvement',
    href: '/signup?plan=pro',
    button: 'Start Pro →',
    highlighted: true,
    features: [
      ['✓', 'Everything in Free'],
      ['✓', 'Unlimited AI analyses'],
      ['✓', 'Full progress timeline'],
      ['✓', 'Technique score history'],
      ['✓', 'Issues fixed tracker'],
      ['✓', 'Weekly practice plans'],
      ['✓', 'Monthly progress report'],
      ['✓', 'Unlimited Ask Coach AI'],
      ['✗', 'Multiple athletes'],
    ],
  },
  {
    name: 'Family',
    monthlyPrice: '$22/mo',
    annualPrice: '$179/yr',
    annualNote: 'or $179 billed yearly',
    subtitle: 'For the whole family',
    href: '/signup?plan=family',
    button: 'Start Family →',
    features: [
      ['✓', 'Everything in Pro'],
      ['✓', 'Up to 5 athlete profiles'],
      ['✓', 'All sports per athlete'],
      ['✓', 'Parent dashboard'],
      ['✓', 'Coach connection per athlete'],
      ['✓', 'One login for everyone'],
    ],
  },
]

function TealButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-bold text-white transition-colors"
      style={{ background: teal }}
    >
      {children}
    </Link>
  )
}

function FeatureList({ features }: { features: string[][] }) {
  return (
    <ul className="mt-5 space-y-2">
      {features.map(([mark, text]) => (
        <li key={text} className="flex gap-2 text-sm" style={{ color: textSecondary }}>
          <span className="font-bold" style={{ color: mark === '✓' ? teal : 'hsl(220, 10%, 65%)' }}>{mark}</span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

function PricingCard({ card }: { card: typeof pricingCards[number] }) {
  return (
    <div
      className="relative flex h-full flex-col rounded-3xl bg-white p-6 shadow-sm"
      style={{ border: card.highlighted ? `2px solid ${teal}` : `1px solid ${warmBorder}` }}
    >
      {card.highlighted && (
        <span className="absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: tealSoft, color: teal }}>
          Most popular
        </span>
      )}
      <h3 className="font-heading text-2xl font-bold">{card.name}</h3>
      <p className="mt-2 text-sm" style={{ color: textSecondary }}>{card.subtitle}</p>
      <div className="mt-5 min-h-[76px]">
        <p className="font-heading text-4xl font-black">{card.monthlyPrice}</p>
        <p className="mt-1 text-sm font-medium" style={{ color: textSecondary }}>{card.annualNote}</p>
      </div>
      <FeatureList features={card.features} />
      <div className="flex-1" />
      <Link
        href={card.href}
        className="mt-6 flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold"
        style={{
          background: card.highlighted ? teal : 'white',
          color: card.highlighted ? 'white' : teal,
          border: card.highlighted ? 'none' : `1px solid ${teal}`,
        }}
      >
        {card.button}
      </Link>
    </div>
  )
}

function ScoreMockup() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <div className="rounded-2xl bg-white p-6 shadow-sm" style={{ border: `1px solid ${warmBorder}` }}>
        <div className="flex items-center justify-between gap-4">
          <p className="font-heading text-lg font-bold">Your Technique Score</p>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: tealSoft, color: teal }}>Tennis · Forehand</span>
        </div>
        <svg viewBox="0 0 400 120" className="mt-6 h-[180px] w-full">
          {[20, 50, 80, 110].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="hsl(30, 10%, 88%)" strokeWidth="1" />)}
          <path d="M20 96 L70 88 L120 76 L170 82 L220 62 L270 54 L330 38 L380 24 L380 120 L20 120 Z" fill={teal} opacity="0.2" />
          <polyline points="20,96 70,88 120,76 170,82 220,62 270,54 330,38 380,24" fill="none" stroke={teal} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {[['20', '96'], ['70', '88'], ['120', '76'], ['170', '82'], ['220', '62'], ['270', '54'], ['330', '38'], ['380', '24']].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill={teal} />
          ))}
          <text x="14" y="112" fontSize="13" fontWeight="700" fill={textSecondary}>58</text>
          <text x="365" y="18" fontSize="13" fontWeight="700" fill={teal}>82</text>
        </svg>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['↑ +24 points', 'hsl(142, 45%, 92%)', 'hsl(142, 58%, 30%)'],
            ['8 sessions', tealSoft, teal],
            ['3 issues fixed ✓', 'hsl(142, 45%, 92%)', 'hsl(142, 58%, 30%)'],
          ].map(([label, bg, color]) => (
            <div key={label} className="rounded-full px-4 py-2 text-center text-sm font-bold" style={{ background: bg, color }}>{label}</div>
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {[
            ['✅', 'Early arm extension', 'Fixed 3 weeks ago'],
            ['📈', 'Narrow base width', 'Improving'],
            ['🔴', 'Follow through', 'Still working on it'],
          ].map(([emoji, issue, status]) => (
            <div key={issue} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm" style={{ borderColor: warmBorder }}>
              <span><span className="mr-2">{emoji}</span><span className="font-semibold">{issue}</span></span>
              <span style={{ color: textSecondary }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: warmBg, color: textPrimary }}>
      <nav className="sticky top-0 z-50 bg-white/95 px-5 py-4 backdrop-blur" style={{ borderBottom: `1px solid ${warmBorder}` }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <BrandMark size="md" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold" style={{ color: teal }}>Sign in</Link>
            <Link href="/signup" className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: teal }}>Start free</Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto max-w-3xl px-5 py-24 text-center">
          <div className="mb-6 inline-flex rounded-full border px-4 py-1 text-xs font-semibold" style={{ background: tealSoft, color: teal, borderColor: 'hsla(168, 62%, 36%, 0.3)' }}>
            Now in beta — join free
          </div>
          <h1 className="font-heading text-5xl leading-tight font-black md:text-6xl">
            Watch yourself
            <br />
            <span style={{ color: teal }}>actually get better.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-xl leading-relaxed" style={{ color: textSecondary }}>
            Upload a video. Get an AI coaching report. Track your technique score over time and see exactly what&apos;s improving — and what isn&apos;t.
          </p>
          <div className="mt-8"><TealButton href="/signup">Start tracking free →</TealButton></div>
          <p className="mt-3 text-sm" style={{ color: textSecondary }}>
            3 free analyses included · No credit card required · Tennis · Golf · Baseball · Basketball · Pickleball
          </p>
        </section>

        <ScoreMockup />

        <section className="border-t px-5 py-20" style={{ borderColor: warmBorder }}>
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="font-heading text-3xl font-bold">How Playvia works</h2>
            <p className="mt-3" style={{ color: textSecondary }}>From raw footage to real improvement</p>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
              {steps.map(([number, emoji, title, description]) => (
                <div key={number} className="rounded-2xl bg-white p-6 text-center shadow-sm" style={{ border: `1px solid ${warmBorder}` }}>
                  <div className="mx-auto flex size-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: teal }}>{number}</div>
                  <div className="mt-4 text-4xl">{emoji}</div>
                  <h3 className="mt-3 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: textSecondary }}>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t px-5 py-20" style={{ borderColor: warmBorder }}>
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="font-heading text-3xl font-bold">Built for your sport</h2>
            <p className="mt-3" style={{ color: textSecondary }}>Specialized AI analysis for every game</p>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
              {sports.map(([emoji, title, issues]) => (
                <Link key={title} href="/signup" className="rounded-2xl bg-white p-5 text-center transition-all hover:shadow-sm" style={{ border: `1px solid ${warmBorder}` }}>
                  <div className="text-4xl">{emoji}</div>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: textSecondary }}>{issues}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-white px-5 py-20" style={{ borderColor: warmBorder }}>
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-heading text-3xl font-bold">Simple pricing</h2>
            <p className="mt-3" style={{ color: textSecondary }}>Start free. Upgrade when you&apos;re ready.</p>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {pricingCards.map(card => <PricingCard key={card.name} card={card} />)}
            </div>
          </div>
        </section>

        <section className="border-t bg-white px-5 py-24 text-center" style={{ borderColor: warmBorder }}>
          <h2 className="font-heading text-4xl font-black">Start tracking your improvement today.</h2>
          <p className="mt-3" style={{ color: textSecondary }}>3 free analyses included. No credit card required.</p>
          <div className="mt-8"><TealButton href="/signup">Create free account →</TealButton></div>
          <p className="mt-4 text-sm" style={{ color: textSecondary }}>
            Already have an account? <Link href="/login" className="font-semibold" style={{ color: teal }}>Sign in →</Link>
          </p>
        </section>
      </main>

      <footer className="border-t bg-white px-5 py-8" style={{ borderColor: warmBorder }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 md:flex-row">
          <BrandMark size="sm" />
          <p className="text-sm" style={{ color: textSecondary }}>AI Coaching for Modern Athletes</p>
          <div className="flex items-center gap-4">
            {[
              ['Analyze', '/analyze'],
              ['Pricing', '/pricing'],
              ['Sign in', '/login'],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="text-sm" style={{ color: textSecondary }}>{label}</Link>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-sm" style={{ color: textSecondary }}>© 2026 Playvia · playvia.studio</p>
      </footer>
    </div>
  )
}