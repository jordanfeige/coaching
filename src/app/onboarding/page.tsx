'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandMark } from '@/components/brand/BrandMark'
import { brand } from '@/lib/brand'

type Role = 'coach' | 'player'

const roles: Array<{
  id: Role
  emoji: string
  title: string
  description: string
  features: string[]
}> = [
  {
    id: 'coach',
    emoji: '🎾',
    title: "I'm a Coach",
    description: 'I teach players, manage lessons, and want AI tools to help my coaching business',
    features: ['Player management', 'AI drill builder', 'Video analysis', 'Scheduling'],
  },
  {
    id: 'player',
    emoji: '🏃',
    title: "I'm a Player",
    description: 'I want to improve my technique, track my progress, and get AI coaching feedback',
    features: ['Technique analysis', 'Progress tracking', 'AI coaching', 'Drill plans'],
  },
]

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const router = useRouter()

  function continueToAccount() {
    if (!selectedRole) return
    localStorage.setItem('onboarding_role', selectedRole)
    router.push('/onboarding/account')
  }

  return (
    <main className="min-h-screen px-5 py-12" style={{ background: brand.bg }}>
      <div className="mx-auto max-w-3xl text-center">
        <BrandMark size="lg" className="mx-auto" />
        <h1 className="mt-12 font-heading text-4xl font-black tracking-tight" style={{ color: brand.text }}>
          Welcome to Playvia
        </h1>
        <p className="mt-3 text-lg" style={{ color: brand.textSecondary }}>
          How will you be using Playvia?
        </p>

        <div className="mx-auto mt-8 grid max-w-xl gap-6 sm:grid-cols-2">
          {roles.map(role => {
            const selected = selectedRole === role.id
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className="cursor-pointer rounded-2xl p-8 text-center transition-all"
                style={{
                  border: `2px solid ${selected ? brand.teal : brand.border}`,
                  background: selected ? brand.tealLight : brand.card,
                }}
              >
                <div className="text-5xl">{role.emoji}</div>
                <h2 className="mt-4 text-xl font-bold" style={{ color: brand.text }}>
                  {role.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: brand.textSecondary }}>
                  {role.description}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {role.features.map(feature => (
                    <span
                      key={feature}
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: brand.cardAlt, color: brand.textSecondary }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={continueToAccount}
          disabled={!selectedRole}
          className="mx-auto mt-8 flex w-full max-w-xl justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: brand.teal }}
        >
          Continue →
        </button>
      </div>
    </main>
  )
}
