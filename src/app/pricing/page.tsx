'use client'

import { useState } from 'react'

const teal = 'hsl(168, 62%, 36%)'
const tealSoft = 'hsl(168, 62%, 95%)'
const warmBg = 'hsl(40, 20%, 97%)'
const warmBorder = 'hsl(30, 10%, 88%)'
const textSecondary = 'hsl(220, 10%, 45%)'
const textMuted = 'hsl(220, 10%, 65%)'

const proFeatures = [
  'Unlimited Via reels',
  'Full progress timeline — track your score over time',
  'Weekly AI-generated practice plans',
  'Monthly progress reports',
  'Issues fixed tracker',
  'Unlimited Ask Coach AI',
]

export default function PricingPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'pricing' }),
      })
      const payload = await response.json()
      if (!response.ok || payload.error) throw new Error(payload.error || 'Could not join waitlist')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join waitlist')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: warmBg }}>
      <main className="mx-auto max-w-lg px-5 py-24 text-center">
        <span
          className="inline-flex rounded-full px-4 py-1 text-xs font-semibold"
          style={{ background: tealSoft, color: teal }}
        >
          Coming soon
        </span>
        <h1 className="mt-4 font-heading text-4xl font-black tracking-tight">
          Playvia Pro is coming.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-lg leading-relaxed" style={{ color: textSecondary }}>
          We&apos;re putting the finishing touches on our Pro plan — unlimited reels, progress tracking, weekly practice plans, and more. Join the list to get early access and help shape the pricing.
        </p>

        <section className="mt-8 rounded-2xl bg-white p-6 text-left shadow-sm" style={{ border: `1px solid ${warmBorder}` }}>
          <h2 className="mb-4 text-sm font-semibold">What&apos;s coming in Pro</h2>
          <div className="space-y-3">
            {proFeatures.map(feature => (
              <div key={feature} className="flex gap-3 text-sm" style={{ color: textSecondary }}>
                <span className="font-bold" style={{ color: teal }}>✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t pt-4 text-center text-xs" style={{ borderColor: warmBorder, color: textMuted }}>
            Early access members get our best rate — locked in forever.
          </p>
        </section>

        {success ? (
          <p className="mt-6 text-sm font-medium" style={{ color: teal }}>
            ✓ You&apos;re on the list! We&apos;ll reach out before we launch.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="min-h-11 flex-1 rounded-xl border bg-white px-4 py-2 text-sm outline-none focus:border-primary"
              style={{ borderColor: warmBorder }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-70"
              style={{ background: teal }}
            >
              {submitting ? 'Joining...' : 'Get early access'}
            </button>
          </form>
        )}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <p className="mt-3 text-center text-xs" style={{ color: textMuted }}>
          No credit card required · We&apos;ll email you before we launch · Unsubscribe anytime
        </p>
      </main>
    </div>
  )
}

/*
PRICING CARDS — restore when Stripe is ready

The previous pricing page rendered:
- Free: $0, 3 Via reels, Ask Coach AI, YouTube coaching videos
- Pro: $12/mo or $99/yr, unlimited reels, full progress timeline, score history, issues fixed tracker, weekly practice plans, monthly progress report, unlimited Ask Coach AI
- Family: $22/mo or $179/yr, up to 5 athlete profiles, all sports per athlete, parent dashboard, coach connection per athlete, one login for everyone

It also included a monthly / annual toggle and three full pricing cards.
*/
