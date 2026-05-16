'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/BrandMark'

const inputClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handleToken() {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setError('Invalid or expired link. Please ask your coach to resend the invite.')
          return
        }
        if (data.user) {
          setUserEmail(data.user.email || '')
          setSessionReady(true)
        }
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) {
          setUserEmail(session.user.email || '')
          setSessionReady(true)
        } else {
          setError('Invalid or expired link. Please ask your coach to resend the invite.')
        }
      }
    }
    handleToken()
  }, [])

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

      if (profile?.role === 'coach') {
        router.push('/dashboard')
      } else {
        router.push('/player')
      }
    }
  }

  if (!sessionReady && !error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-4 text-center">
          <BrandMark variant="authPanel" className="mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying your invite link…</p>
        </div>
      </div>
    )

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandMark variant="authPanel" className="mx-auto" />
          <h1 className="font-heading mt-6 text-2xl font-bold text-foreground">Create your account</h1>
          {userEmail && <p className="mt-2 text-sm font-medium text-primary">{userEmail}</p>}
          <p className="mt-2 text-sm text-muted-foreground">Set a password to access your dashboard.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {error ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
              <Link href="/login" className="block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Go to login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className={inputClass}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl py-6 text-sm font-semibold">
                {loading ? 'Creating your account…' : 'Create account & sign in'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
