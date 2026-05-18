'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [role] = useState<Role>(() => {
    if (typeof window === 'undefined') return 'player'
    const storedRole = localStorage.getItem('onboarding_role')
    return storedRole === 'coach' || storedRole === 'player' ? storedRole : 'player'
  })
  const router = useRouter()

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
              Your coaching account is ready for review.
            </p>
            <div className="mx-auto mt-8 max-w-md rounded-2xl border p-5 text-left" style={{ borderColor: brand.border }}>
              <p className="mb-3 text-sm font-bold" style={{ color: brand.text }}>
                Once approved, you can:
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
            <button
              type="button"
              onClick={() => router.push('/pending')}
              className="mx-auto mt-8 inline-flex rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: brand.teal }}
            >
              Submit my application →
            </button>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-xl">
            <p className="text-lg font-semibold" style={{ color: brand.textSecondary }}>
              You have 3 free analyses included
            </p>
            <div
              className="mt-6 rounded-3xl p-6 text-left text-white shadow-sm"
              style={{ background: brand.teal }}
            >
              <p className="font-heading text-2xl font-bold">Your application is ready</p>
              <p className="mt-2 text-sm text-white/85">
                Submit your beta application and we&apos;ll email you when access is approved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/pending')}
              className="mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: brand.teal }}
            >
              Submit my application →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
