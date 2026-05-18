'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/brand/BrandMark'
import { brand } from '@/lib/brand'

type Role = 'coach' | 'player'

function ProgressDots() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map(index => (
        <span key={index} className="size-2.5 rounded-full" style={{ background: brand.teal }} />
      ))}
      <span className="ml-1 text-sm font-bold" style={{ color: brand.teal }}>✓</span>
    </div>
  )
}

export default function OnboardingReadyPage() {
  const [role, setRole] = useState<Role>('player')

  useEffect(() => {
    const storedRole = localStorage.getItem('onboarding_role')
    if (storedRole === 'coach' || storedRole === 'player') setRole(storedRole)
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10" style={{ background: brand.bg }}>
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 text-center shadow-sm md:p-8" style={{ border: `1px solid ${brand.border}` }}>
        <BrandMark size="md" className="text-center" />
        <div className="mt-8">
          <ProgressDots />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brand.textMuted }}>
            Step 3 of 3
          </p>
        </div>
        <h1 className="mt-6 font-heading text-3xl font-black" style={{ color: brand.text }}>
          You&apos;re all set!
        </h1>

        {role === 'coach' ? (
          <div className="mt-8">
            <p className="text-lg font-semibold" style={{ color: brand.textSecondary }}>
              Here&apos;s how to get started
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ['Add your first player', '/dashboard/players', 'primary'],
                ['Set your availability', '/dashboard/schedule', 'secondary'],
                ['Explore the dashboard', '/dashboard', 'link'],
              ].map(([label, href, variant]) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-2xl px-4 py-5 text-sm font-bold"
                  style={{
                    background: variant === 'primary' ? brand.teal : variant === 'secondary' ? brand.tealLight : brand.cardAlt,
                    color: variant === 'primary' ? 'white' : brand.teal,
                    border: `1px solid ${variant === 'primary' ? brand.teal : brand.border}`,
                  }}
                >
                  {label} →
                </Link>
              ))}
            </div>
            <div className="mx-auto mt-8 max-w-md rounded-2xl border p-5 text-left" style={{ borderColor: brand.border }}>
              <p className="mb-3 text-sm font-bold" style={{ color: brand.text }}>
                Getting started checklist
              </p>
              {[
                'Add a player to your roster',
                'Schedule your first lesson',
                'Try the AI drill builder',
                'Upload a player video for analysis',
              ].map(item => (
                <div key={item} className="py-1.5 text-sm" style={{ color: brand.textSecondary }}>
                  □ {item}
                </div>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="mx-auto mt-8 inline-flex rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: brand.teal }}
            >
              Go to dashboard →
            </Link>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-xl">
            <p className="text-lg font-semibold" style={{ color: brand.textSecondary }}>
              You have 3 free analyses included
            </p>
            <Link
              href="/player/analyze"
              className="mt-6 block rounded-3xl p-6 text-left text-white shadow-sm"
              style={{ background: brand.teal }}
            >
              <p className="font-heading text-2xl font-bold">Analyze your technique now →</p>
              <p className="mt-2 text-sm text-white/85">
                Upload a 30-second video and get your first coaching report
              </p>
            </Link>
            <Link href="/player" className="mt-6 inline-flex text-sm font-bold" style={{ color: brand.teal }}>
              Go to my dashboard →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
