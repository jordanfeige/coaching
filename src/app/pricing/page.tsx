'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BrandMark } from '@/components/brand/BrandMark'

const teal = 'hsl(168, 62%, 36%)'
const tealSoft = 'hsl(168, 62%, 95%)'
const warmBg = 'hsl(40, 20%, 97%)'
const warmBorder = 'hsl(30, 10%, 88%)'
const textSecondary = 'hsl(220, 10%, 45%)'

const tiers = [
  {
    name: 'Free',
    monthly: '$0',
    annual: '$0',
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
    monthly: '$12/mo',
    annual: '$99/yr',
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
    monthly: '$22/mo',
    annual: '$179/yr',
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

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className="min-h-screen" style={{ background: warmBg }}>
      <nav className="border-b bg-white/95 px-5 py-4" style={{ borderColor: warmBorder }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <BrandMark size="md" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold" style={{ color: teal }}>Sign in</Link>
            <Link href="/signup" className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: teal }}>Start free</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-5 py-16">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: teal }}>Pricing</p>
          <h1 className="mt-4 font-heading text-4xl font-black tracking-tight md:text-6xl">Simple pricing</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed" style={{ color: textSecondary }}>
            Start free. Upgrade when you&apos;re ready to track progress without limits.
          </p>
          <div className="mx-auto mt-8 inline-flex rounded-full border bg-white p-1" style={{ borderColor: warmBorder }}>
            {[
              ['monthly', 'Monthly'],
              ['annual', 'Annual — save ~30%'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setBilling(value as 'monthly' | 'annual')}
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  background: billing === value ? teal : 'transparent',
                  color: billing === value ? 'white' : textSecondary,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map(tier => (
            <div
              key={tier.name}
              className="relative rounded-3xl bg-white p-6 shadow-sm"
              style={{ border: tier.highlighted ? `2px solid ${teal}` : `1px solid ${warmBorder}` }}
            >
              {tier.highlighted && (
                <span className="absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: tealSoft, color: teal }}>
                  Most popular
                </span>
              )}
              <h2 className="font-heading text-2xl font-bold">{tier.name}</h2>
              <p className="mt-2 text-sm" style={{ color: textSecondary }}>{tier.subtitle}</p>
              <p className="mt-5 font-heading text-3xl font-black">{billing === 'monthly' ? tier.monthly : tier.annual}</p>
              <FeatureList features={tier.features} />
              <Link
                href={tier.href}
                className="mt-6 flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold"
                style={{
                  background: tier.highlighted ? teal : 'white',
                  color: tier.highlighted ? 'white' : teal,
                  border: tier.highlighted ? 'none' : `1px solid ${teal}`,
                }}
              >
                {tier.button}
              </Link>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
