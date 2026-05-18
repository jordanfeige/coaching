'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { SmartBrandMark } from '@/components/brand/SmartBrandMark'

const inputClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none'

const sports = [
  { id: 'tennis', label: '🎾 Tennis' },
  { id: 'golf', label: '⛳ Golf' },
  { id: 'baseball', label: '⚾ Baseball' },
  { id: 'basketball', label: '🏀 Basketball' },
]

function SignupForm() {
  const searchParams = useSearchParams()
  const role: 'coach' | 'player' = searchParams.get('role') === 'coach' ? 'coach' : 'player'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedSports, setSelectedSports] = useState<string[]>(['tennis'])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function toggleSport(sportId: string) {
    setSelectedSports(current =>
      current.includes(sportId)
        ? current.filter(id => id !== sportId)
        : [...current, sportId]
    )
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }
    if (selectedSports.length === 0) {
      setError('Select at least one sport')
      setLoading(false)
      return
    }
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        fullName,
        role,
        sports: selectedSports,
      }),
    })
    const payload = await response.json()
    if (!response.ok || payload.error) {
      setError(payload.error || 'Could not create account')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push(role === 'coach' ? '/dashboard' : '/analyze?welcome=true')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-muted/40 p-12 lg:flex">
        <div>
          <SmartBrandMark variant="authHero" audience={role === 'coach' ? 'Coaches' : 'Athletes & families'} />
          <h1 className="font-heading mt-10 text-4xl leading-tight font-bold text-foreground md:text-5xl">
            {role === 'coach' ? 'Build your coaching' : "Follow your athlete's"}
            <br />
            <span className="text-primary">{role === 'coach' ? 'workspace.' : 'progress in one place.'}</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            {role === 'coach'
              ? 'Manage players, schedule lessons, review video, and keep every athlete moving forward.'
              : 'Book lessons, read coach notes, and stay aligned — built for families using Playvia with their coach.'}
          </p>
        </div>
        <div className="flex gap-10">
          {[
            ['Scheduling', 'Shared calendar'],
            ['Coach notes', 'Transparent feedback'],
            ['Lessons', 'Simple booking'],
          ].map(([label, sub]) => (
            <div key={label}>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <SmartBrandMark variant="authPanel" audience={role === 'coach' ? 'Coaches' : 'Athletes & families'} className="mx-auto max-w-sm text-center" />
          </div>
          <div className="mb-8">
            <h2 className="font-heading mb-2 text-2xl font-bold text-foreground">
              {role === 'coach' ? 'Set up your coaching account' : 'Create your free account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {role === 'coach'
                ? 'Create your coach workspace for lessons, players, drills, and video analysis.'
                : 'Get AI-powered coaching feedback on your technique. Free to start.'}
            </p>
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                id="signup-name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className={inputClass}
                placeholder="Jordan Feige"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="signup-confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            {role === 'player' && (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Which sports are you working on?</p>
              <div className="grid grid-cols-2 gap-2">
                {sports.map(option => {
                  const active = selectedSports.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleSport(option.id)}
                      aria-pressed={active}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
            )}
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70"
            >
              {loading ? 'Creating account...' : role === 'coach' ? 'Create coaching account →' : 'Create free account →'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupForm />
    </Suspense>
  )
}
