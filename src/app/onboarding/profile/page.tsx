'use client'

import { useEffect, useMemo, useState } from 'react'
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

const skillLevels = ['Beginner', 'Intermediate', 'Advanced']
const yearsOptions = ['0-1', '1-3', '3-5', '5-10', '10+']
const inputClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none'

function ProgressDots() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map(index => (
        <span
          key={index}
          className="size-2.5 rounded-full"
          style={{ background: index <= 1 ? brand.teal : brand.border }}
        />
      ))}
    </div>
  )
}

export default function OnboardingProfilePage() {
  const [role, setRole] = useState<Role>('player')
  const [sportsCoached, setSportsCoached] = useState<string[]>(['tennis'])
  const [location, setLocation] = useState('')
  const [yearsExperience, setYearsExperience] = useState('1-3')
  const [hourlyRate, setHourlyRate] = useState('')
  const [sport, setSport] = useState('tennis')
  const [skillLevel, setSkillLevel] = useState('Intermediate')
  const [age, setAge] = useState('')
  const [hasCoach, setHasCoach] = useState(false)
  const [coachInviteCode, setCoachInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadRole() {
      const storedRole = localStorage.getItem('onboarding_role')
      if (storedRole === 'coach' || storedRole === 'player') {
        setRole(storedRole)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role === 'coach' || profile?.role === 'player') {
        setRole(profile.role)
        localStorage.setItem('onboarding_role', profile.role)
      }
    }

    loadRole()
  }, [router, supabase])

  function toggleCoachSport(sportId: string) {
    setSportsCoached(current =>
      current.includes(sportId)
        ? current.filter(id => id !== sportId)
        : [...current, sportId]
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const payload =
      role === 'coach'
        ? {
            role: 'coach',
            sports_coached: sportsCoached,
            location: location.trim() || null,
            years_experience: yearsExperience,
            hourly_rate: hourlyRate ? Number(hourlyRate) : null,
          }
        : {
            role: 'player',
            sport,
            skill_level: skillLevel,
            age: age ? Number(age) : null,
            has_coach: hasCoach,
            coach_invite_code: hasCoach && coachInviteCode.trim() ? coachInviteCode.trim() : null,
          }

    const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', user.id)
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    if (user.email) {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'welcome',
          to: user.email,
          name:
            typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
              ? user.user_metadata.full_name.trim().split(/\s+/)[0]
              : user.email.split('@')[0],
          role,
        }),
      }).catch(error => console.error('Could not send welcome email:', error))
    }

    localStorage.setItem('onboarding_role', role)
    router.push('/onboarding/ready')
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10" style={{ background: brand.bg }}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-sm" style={{ border: `1px solid ${brand.border}` }}>
        <BrandMark size="md" className="text-center" />
        <div className="mt-8">
          <ProgressDots />
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brand.textMuted }}>
            Step 2 of 3
          </p>
        </div>

        <h1 className="mt-6 text-center font-heading text-2xl font-bold" style={{ color: brand.text }}>
          {role === 'coach' ? 'Tell us about your coaching' : 'What are you working on?'}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {role === 'coach' ? (
            <>
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
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="coach-location" className="mb-1.5 block text-sm font-medium text-foreground">
                    Location
                  </label>
                  <input id="coach-location" value={location} onChange={event => setLocation(event.target.value)} className={inputClass} placeholder="City, State" />
                </div>
                <div>
                  <label htmlFor="coach-years" className="mb-1.5 block text-sm font-medium text-foreground">
                    Years coaching
                  </label>
                  <select id="coach-years" value={yearsExperience} onChange={event => setYearsExperience(event.target.value)} className={inputClass}>
                    {yearsOptions.map(option => <option key={option}>{option}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="coach-rate" className="mb-1.5 block text-sm font-medium text-foreground">
                  Hourly rate <span className="text-muted-foreground">(optional)</span>
                </label>
                <input id="coach-rate" type="number" min="0" value={hourlyRate} onChange={event => setHourlyRate(event.target.value)} className={inputClass} placeholder="$75" />
              </div>
            </>
          ) : (
            <>
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
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
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
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
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
              <div>
                <label htmlFor="player-age" className="mb-1.5 block text-sm font-medium text-foreground">
                  Age <span className="text-muted-foreground">(optional)</span>
                </label>
                <input id="player-age" type="number" min="1" value={age} onChange={event => setAge(event.target.value)} className={inputClass} />
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: brand.border }}>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-foreground">Do you have a coach?</p>
                  <div className="flex rounded-full border p-1" style={{ borderColor: brand.border }}>
                    {[true, false].map(value => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setHasCoach(value)}
                        className="rounded-full px-4 py-1.5 text-xs font-bold"
                        style={{
                          background: hasCoach === value ? brand.teal : 'transparent',
                          color: hasCoach === value ? 'white' : brand.textSecondary,
                        }}
                      >
                        {value ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
                {hasCoach && (
                  <input
                    value={coachInviteCode}
                    onChange={event => setCoachInviteCode(event.target.value)}
                    className={`${inputClass} mt-4`}
                    placeholder="Enter your coach's invite code (optional)"
                  />
                )}
              </div>
            </>
          )}

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={loading || (role === 'coach' && sportsCoached.length === 0)}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-70"
            style={{ background: brand.teal }}
          >
            {loading ? 'Saving...' : 'Continue →'}
          </button>
        </form>
      </div>
    </main>
  )
}
