'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandMark } from '@/components/brand/BrandMark'
import { createClient } from '@/lib/supabase'
import { brand } from '@/lib/brand'

type Role = 'coach' | 'player'

const sports = [
  { id: 'tennis', label: '🎾 Tennis' },
  { id: 'golf', label: '⛳ Golf' },
  { id: 'baseball', label: '⚾ Baseball' },
  { id: 'basketball', label: '🏀 Basketball' },
  { id: 'pickleball', label: '🏓 Pickleball' },
]

const roleCards = [
  {
    id: 'coach' as const,
    emoji: '🎾',
    title: "I'm a Coach",
    description: 'I teach players, manage lessons, and want AI tools to help my coaching business',
  },
  {
    id: 'player' as const,
    emoji: '🏃',
    title: "I'm a Player",
    description: 'I want to improve my technique, track my progress, and get AI coaching feedback',
  },
]

const skillLevels = ['Beginner', 'Intermediate', 'Advanced']
const inputClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none'

export default function OnboardingRolePage() {
  const [role, setRole] = useState<Role | null>(null)
  const [sportsCoached, setSportsCoached] = useState<string[]>(['tennis'])
  const [location, setLocation] = useState('')
  const [sport, setSport] = useState('tennis')
  const [skillLevel, setSkillLevel] = useState('Intermediate')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function toggleCoachSport(sportId: string) {
    setSportsCoached(current =>
      current.includes(sportId)
        ? current.filter(id => id !== sportId)
        : [...current, sportId]
    )
  }

  async function handleSubmit() {
    if (!role) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const payload =
      role === 'coach'
        ? { role, sports_coached: sportsCoached, location: location.trim() || null }
        : { role, sport, skill_level: skillLevel }

    const { error: updateError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? null,
      ...payload,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    localStorage.setItem('onboarding_role', role)
    router.push(role === 'coach' ? '/dashboard' : '/player?welcome=true')
  }

  return (
    <main className="min-h-screen px-5 py-12" style={{ background: brand.bg }}>
      <div className="mx-auto max-w-3xl text-center">
        <BrandMark size="lg" className="mx-auto" />
        <h1 className="mt-12 font-heading text-3xl font-black tracking-tight md:text-4xl" style={{ color: brand.text }}>
          One quick thing — how will you use Playvia?
        </h1>

        <div className="mx-auto mt-8 grid max-w-xl gap-6 sm:grid-cols-2">
          {roleCards.map(card => {
            const selected = role === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setRole(card.id)}
                className="rounded-2xl p-8 text-center transition-all"
                style={{
                  border: `2px solid ${selected ? brand.teal : brand.border}`,
                  background: selected ? brand.tealLight : brand.card,
                }}
              >
                <div className="text-5xl">{card.emoji}</div>
                <h2 className="mt-4 text-xl font-bold" style={{ color: brand.text }}>{card.title}</h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: brand.textSecondary }}>{card.description}</p>
              </button>
            )
          })}
        </div>

        {role && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-white p-5 text-left shadow-sm" style={{ border: `1px solid ${brand.border}` }}>
            {role === 'coach' ? (
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">Sports you coach</p>
                  <div className="flex flex-wrap gap-2">
                    {sports.map(option => {
                      const selected = sportsCoached.includes(option.id)
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleCoachSport(option.id)}
                          className="rounded-full border px-4 py-2 text-sm font-semibold"
                          style={{
                            borderColor: selected ? brand.teal : brand.border,
                            background: selected ? brand.tealLight : brand.card,
                            color: selected ? brand.teal : brand.textSecondary,
                          }}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label htmlFor="role-location" className="mb-1.5 block text-sm font-medium text-foreground">Location</label>
                  <input id="role-location" value={location} onChange={event => setLocation(event.target.value)} className={inputClass} placeholder="City, State" />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">Primary sport</p>
                  <div className="flex flex-wrap gap-2">
                    {sports.map(option => {
                      const selected = sport === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSport(option.id)}
                          className="rounded-full border px-4 py-2 text-sm font-semibold"
                          style={{
                            borderColor: selected ? brand.teal : brand.border,
                            background: selected ? brand.tealLight : brand.card,
                            color: selected ? brand.teal : brand.textSecondary,
                          }}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">Skill level</p>
                  <div className="flex flex-wrap gap-2">
                    {skillLevels.map(option => {
                      const selected = skillLevel === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSkillLevel(option)}
                          className="rounded-full border px-4 py-2 text-sm font-semibold"
                          style={{
                            borderColor: selected ? brand.teal : brand.border,
                            background: selected ? brand.tealLight : brand.card,
                            color: selected ? brand.teal : brand.textSecondary,
                          }}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div className="mx-auto mt-5 max-w-xl rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!role || loading || (role === 'coach' && sportsCoached.length === 0)}
          className="mx-auto mt-8 flex w-full max-w-xl justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: brand.teal }}
        >
          {loading ? 'Saving...' : 'Take me to Playvia →'}
        </button>
      </div>
    </main>
  )
}
