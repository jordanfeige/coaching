'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

const GOALS = [
  { value: 'recruited_college', label: 'Get recruited to play in college' },
  { value: 'scholarship_smaller', label: 'Earn a scholarship to a smaller program' },
  { value: 'win_highest_level', label: 'Win at the highest level I can compete' },
  { value: 'improve_have_fun', label: 'Improve my technique and have fun' },
  { value: 'help_my_child', label: 'Help my child enjoy this and get better' },
  { value: 'not_sure_yet', label: "I'm not sure yet" },
]

export default function PlayerSettingsPage() {
  const supabase = createClient()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [goal, setGoal] = useState('')
  const [recruitingOn, setRecruitingOn] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const pid = await getLinkedPlayerIdForUser(supabase, user.id)
      if (!pid) {
        setLoading(false)
        return
      }
      setPlayerId(pid)
      const { data: prefs } = await supabase
        .from('journey_preferences')
        .select('primary_goal, not_recruiting')
        .eq('player_id', pid)
        .maybeSingle()
      setGoal(prefs?.primary_goal ?? '')
      setRecruitingOn(!(prefs?.not_recruiting ?? false))
      setLoading(false)
    }
    load()
  }, [supabase])

  async function saveGoal(value: string) {
    if (!playerId) return
    setSaving(true)
    await supabase.from('journey_preferences').upsert({
      player_id: playerId,
      primary_goal: value,
      goal_set_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setGoal(value)
    setSaving(false)
  }

  async function saveRecruiting(on: boolean) {
    if (!playerId) return
    setSaving(true)
    await supabase.from('journey_preferences').upsert({
      player_id: playerId,
      not_recruiting: !on,
      recruiting_banner_dismissed: !on,
      updated_at: new Date().toISOString(),
    })
    setRecruitingOn(on)
    setSaving(false)
    window.location.reload()
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 60px' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, marginBottom: 24 }}>
        Settings
      </h1>

      <section style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 10,
          }}
        >
          Your goal
        </h2>
        <select
          value={goal}
          onChange={e => saveGoal(e.target.value)}
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            fontSize: 14,
          }}
        >
          <option value="">Select a goal</option>
          {GOALS.map(g => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2
          style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 10,
          }}
        >
          Recruiting tools
        </h2>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 14,
          }}
        >
          <input
            type="checkbox"
            checked={recruitingOn}
            onChange={e => saveRecruiting(e.target.checked)}
            disabled={saving}
          />
          Show recruiting journey tools
        </label>
        <p
          style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 12,
            color: '#6B7280',
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          Turn off to hide the recruiting banner and wizard prompts. Your completed
          wizard stays saved if you turn it back on.
        </p>
      </section>
    </div>
  )
}
