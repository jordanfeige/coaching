'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BrandMark } from '@/components/brand/BrandMark'

const inputClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/parent')
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-muted/40 p-12 lg:flex">
        <div>
          <BrandMark variant="authHero" audience="Parents & guardians" />
          <h1 className="font-heading mt-10 text-4xl leading-tight font-bold text-foreground md:text-5xl">
            Follow your athlete&apos;s
            <br />
            <span className="text-primary">progress in one place.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Book lessons, read coach notes, and stay aligned — built for families using Playvia with their coach.
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
            <BrandMark variant="authPanel" audience="Parents & guardians" className="mx-auto max-w-sm text-center" />
          </div>
          <div className="mb-8">
            <h2 className="font-heading mb-2 text-2xl font-bold text-foreground">Create your account</h2>
            <p className="text-sm text-muted-foreground">
              Sign up to access the parent portal — schedules, notes, and updates from your coach.
            </p>
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
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
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
