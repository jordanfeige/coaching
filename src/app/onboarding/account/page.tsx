'use client'

import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { BrandMark } from '@/components/brand/BrandMark'
import { createClient } from '@/lib/supabase'
import { brand } from '@/lib/brand'

type Role = 'coach' | 'player'
type RoleSnapshot = Role | 'unknown' | null

const inputClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none'

function ProgressDots() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map(index => (
        <span
          key={index}
          className="size-2.5 rounded-full"
          style={{ background: index === 0 ? brand.teal : brand.border }}
        />
      ))}
    </div>
  )
}

function subscribeToOnboardingRole(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getOnboardingRoleSnapshot(): RoleSnapshot {
  const storedRole = localStorage.getItem('onboarding_role')
  return storedRole === 'coach' || storedRole === 'player' ? storedRole : null
}

function getOnboardingRoleServerSnapshot(): RoleSnapshot {
  return 'unknown'
}

export default function OnboardingAccountPage() {
  const role = useSyncExternalStore(
    subscribeToOnboardingRole,
    getOnboardingRoleSnapshot,
    getOnboardingRoleServerSnapshot
  )
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (role === null) {
      router.replace('/onboarding')
    }
  }, [role, router])

  async function saveProfile(userId: string, normalizedEmail: string, accountRole: Role) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: normalizedEmail,
          role: accountRole,
          beta_status: 'pending',
          analyses_used: 0,
          is_subscribed: false,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      console.error('Profile save error:', profileError)
      try {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              email: normalizedEmail,
              role: accountRole,
            },
            { onConflict: 'id' }
          )
        if (fallbackError) console.error('Profile fallback save error:', fallbackError)
      } catch (fallbackError) {
        console.error('Profile fallback save failed:', fallbackError)
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    if (role !== 'coach' && role !== 'player') {
      setError('Choose how you will use Playvia before creating an account')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const { data, error: signupError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName.trim(),
          role,
        },
      },
    })

    if (signupError) {
      const msg = signupError.message?.toLowerCase() || ''
      if (
        msg.includes('email') ||
        msg.includes('smtp') ||
        msg.includes('confirmation') ||
        msg.includes('sending')
      ) {
        console.warn('Email send failed but continuing:', signupError.message)
        localStorage.setItem('onboarding_role', role)
        router.push('/onboarding/profile')
        return
      }

      setError(signupError.message || 'Failed to create account. Please try again.')
      setLoading(false)
      return
    }

    if (data.user) {
      await saveProfile(data.user.id, normalizedEmail, role)
    } else {
      console.warn('Signup succeeded without a user object; continuing onboarding')
    }

    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_signup_admin',
        name: fullName.trim() || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role,
        sport: null,
        signedUpAt: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }),
      }),
    }).catch(error => console.error('Could not send admin signup notification:', error))

    localStorage.setItem('onboarding_role', role)
    router.push('/onboarding/profile')
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10" style={{ background: brand.bg }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm" style={{ border: `1px solid ${brand.border}` }}>
        <BrandMark size="md" className="text-center" />
        <div className="mt-8">
          <ProgressDots />
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brand.textMuted }}>
            Step 1 of 3
          </p>
        </div>

        <h1 className="mt-6 text-center font-heading text-2xl font-bold" style={{ color: brand.text }}>
          {role === 'unknown'
            ? 'Create your account'
            : role === 'coach'
              ? 'Set up your coaching account'
              : 'Create your player account'}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="onboarding-name" className="mb-1.5 block text-sm font-medium text-foreground">
              Full name
            </label>
            <input id="onboarding-name" value={fullName} onChange={event => setFullName(event.target.value)} required className={inputClass} placeholder="Jordan Feige" />
          </div>
          <div>
            <label htmlFor="onboarding-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input id="onboarding-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required className={inputClass} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="onboarding-password" className="mb-1.5 block text-sm font-medium text-foreground">
              Password
            </label>
            <input id="onboarding-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} className={inputClass} placeholder="At least 8 characters" />
          </div>
          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={loading || role === 'unknown' || role === null}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-70"
            style={{ background: brand.teal }}
          >
            {loading ? 'Creating account...' : role === 'unknown' ? 'Loading...' : 'Continue →'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: brand.textSecondary }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: brand.teal }}>
            Sign in →
          </Link>
        </p>
      </div>
    </main>
  )
}
