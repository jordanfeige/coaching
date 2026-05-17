'use client'

import { useState } from 'react'

type WaitlistFormProps = {
  sport?: string
  source?: string
  successMessage?: string
  className?: string
}

export function WaitlistForm({
  sport,
  source = 'pricing',
  successMessage = "✓ You're on the list! We'll email you when Pro launches.",
  className,
}: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sport, source }),
      })
      const payload = await response.json()
      if (!response.ok || payload.error) throw new Error(payload.error || 'Could not join waitlist')
      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join waitlist')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return <p className="text-sm font-semibold text-primary">{successMessage}</p>
  }

  return (
    <div className={className}>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="min-h-11 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70"
        >
          {loading ? 'Joining...' : 'Get early access'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
