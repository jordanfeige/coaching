'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandMark } from '@/components/brand/BrandMark'
import { createClient } from '@/lib/supabase'
import { homePathForRole, isBetaGateEnabled } from '@/lib/beta-gate'

type PendingProfile = {
  beta_status: string | null
  role: string | null
}

export default function PendingPage() {
  const [profile, setProfile] = useState<PendingProfile | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    async function check() {
      if (!isBetaGateEnabled(window.location.hostname)) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        router.push(homePathForRole(profile?.role))
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('beta_status, role')
        .eq('id', user.id)
        .single()

      if (profile?.beta_status === 'approved') {
        router.push(homePathForRole(profile.role))
        return
      }

      setProfile(profile)
    }

    check()
    const interval = window.setInterval(check, 30000)
    return () => window.clearInterval(interval)
  }, [router, supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{ background: 'hsl(40,20%,97%)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandMark size="lg" />
        </div>

        <div className="rounded-2xl p-8 text-center" style={{ background: 'white', border: '1px solid hsl(30,10%,88%)' }}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'hsl(168,62%,95%)' }}>
            <span style={{ fontSize: 28 }}>🎾</span>
          </div>

          <h1 className="mb-3 text-2xl font-bold" style={{ color: 'hsl(220,20%,15%)' }}>
            You&apos;re on the list
          </h1>

          <p className="mb-6 text-sm leading-relaxed" style={{ color: 'hsl(220,10%,45%)' }}>
            Thanks for signing up for the Playvia beta. We&apos;re reviewing applications and approving players in small batches to make sure everyone gets a great experience.
          </p>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'hsl(38,92%,95%)', border: '1px solid hsl(38,92%,80%)' }}>
            <div className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'hsl(38,92%,50%)' }} />
            <span className="text-xs font-semibold" style={{ color: 'hsl(38,92%,35%)' }}>
              {profile?.beta_status === 'rejected' ? 'Application currently unavailable' : 'Application pending review'}
            </span>
          </div>

          <div className="mb-6 rounded-xl p-4 text-left" style={{ background: 'hsl(40,20%,97%)', border: '1px solid hsl(30,10%,88%)' }}>
            <p className="mb-3 text-xs font-semibold" style={{ color: 'hsl(220,20%,15%)' }}>
              What happens next
            </p>
            {[
              "We'll review your application within 24 hours",
              "You'll get an email the moment you're approved",
              "Once approved you'll have full access to all features",
            ].map(item => (
              <div key={item} className="mb-2 flex items-start gap-2 last:mb-0">
                <span style={{ color: 'hsl(168,62%,36%)', fontSize: 14, marginTop: 1 }}>✓</span>
                <p className="text-xs" style={{ color: 'hsl(220,10%,45%)' }}>{item}</p>
              </div>
            ))}
          </div>

          <p className="mb-6 text-xs" style={{ color: 'hsl(220,10%,55%)' }}>
            While you wait — know someone who&apos;d love AI coaching feedback? Share Playvia with them.
          </p>

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Playvia — AI Coaching for Modern Athletes',
                  text: 'Check out Playvia — upload a video and get instant AI coaching feedback on your technique.',
                  url: 'https://playvia.studio',
                })
              } else {
                navigator.clipboard.writeText('https://playvia.studio')
                alert('Link copied!')
              }
            }}
            className="mb-3 w-full rounded-xl py-2.5 text-sm font-semibold"
            style={{ background: 'hsl(168,62%,36%)', color: 'white' }}
          >
            Share Playvia →
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-xl py-2.5 text-sm font-medium"
            style={{ color: 'hsl(220,10%,55%)', background: 'transparent', border: 'none' }}
          >
            Sign out
          </button>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: 'hsl(220,10%,65%)' }}>
          Questions? Email us at{' '}
          <a href="mailto:hello@playvia.studio" style={{ color: 'hsl(168,62%,36%)' }}>
            hello@playvia.studio
          </a>
        </p>
      </div>
    </div>
  )
}
