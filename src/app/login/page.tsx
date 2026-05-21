'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SmartBrandMark } from '@/components/brand/SmartBrandMark'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    let { data: profile } = await supabase
      .from('profiles')
      .select('role, player_id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!profile) {
      await fetch('/api/onboarding/ensure-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.user.email,
          full_name:
            typeof data.user.user_metadata?.full_name === 'string'
              ? data.user.user_metadata.full_name
              : null,
          role:
            data.user.user_metadata?.role === 'coach' ||
            data.user.user_metadata?.role === 'player'
              ? data.user.user_metadata.role
              : 'player',
        }),
      })
      const refetch = await supabase
        .from('profiles')
        .select('role, player_id')
        .eq('id', data.user.id)
        .maybeSingle()
      profile = refetch.data
    }

    if (!profile?.role) {
      router.push('/onboarding/role')
    } else if (profile.role === 'coach') {
      router.push('/dashboard')
    } else if (profile.role === 'player' && profile.player_id) {
      router.push('/player')
    } else {
      router.push('/player?welcome=true')
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-muted/40 p-12 lg:flex">
        <div>
          <SmartBrandMark variant="authHero" />
          <h1 className="font-heading mt-10 text-4xl leading-tight font-bold text-foreground md:text-5xl">
            Welcome back to Playvia
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Sign in to access your lessons, drills, and coaching reports.
          </p>
        </div>
        <div className="flex gap-10">
          {[
            ['Players', 'Managed'],
            ['Lessons', 'Tracked'],
            ['Videos', 'Reviewed'],
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
            <SmartBrandMark variant="authPanel" className="mx-auto max-w-sm" />
          </div>
          <div className="mb-8">
            <h2 className="font-heading mb-2 text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/onboarding" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
