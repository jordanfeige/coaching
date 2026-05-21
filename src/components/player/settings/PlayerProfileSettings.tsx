'use client'

import { useCallback, useEffect, useState } from 'react'
import ProfileField, { SettingsSection } from '@/components/player/settings/ProfileField'
import { brand, fonts } from '@/lib/brand'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import type { ProfileUpdateField } from '@/lib/player-profile-update'
import { usePageReady } from '@/contexts/PageLoadingContext'

const GOALS = [
  { value: 'recruited_college', label: 'Get recruited to play in college' },
  { value: 'scholarship_smaller', label: 'Earn a scholarship to a smaller program' },
  { value: 'win_highest_level', label: 'Win at the highest level I can compete' },
  { value: 'improve_have_fun', label: 'Improve my technique and have fun' },
  { value: 'help_my_child', label: 'Help my child enjoy this and get better' },
  { value: 'not_sure_yet', label: "I'm not sure yet" },
]

const DIVISIONS = [
  { value: 'd1_power', label: 'D1 Power' },
  { value: 'd1_mid_major', label: 'D1 Mid-major' },
  { value: 'd2', label: 'D2' },
  { value: 'd3', label: 'D3' },
  { value: 'naia', label: 'NAIA' },
  { value: 'juco', label: 'JUCO' },
  { value: 'not_sure', label: 'Not sure' },
]

const ACADEMIC = [
  { value: 'ivy', label: 'Ivy League' },
  { value: 'top_25_academic', label: 'Top-25 academic' },
  { value: 'top_100_academic', label: 'Top-100 academic' },
  { value: 'public_state', label: 'Public state' },
  { value: 'no_preference', label: 'No preference' },
]

const GEO = [
  { value: 'anywhere', label: 'Anywhere' },
  { value: 'specific_state', label: 'Specific state' },
  { value: 'specific_region', label: 'Specific region' },
]

const SPORTS = [
  { value: 'tennis', label: 'Tennis' },
  { value: 'golf', label: 'Golf' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'pickleball', label: 'Pickleball' },
]

const SKILLS = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
]

const CLASS_YEARS = ['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2030+']

type FormState = {
  birthDate: string
  classYear: string
  sport: string
  skillLevel: string
  utr: number | null
  utrLinked: boolean
  gpa: string
  sat: string
  act: string
  goal: string
  targetDivision: string
  targetAcademicTier: string
  targetGeography: string
  targetState: string
  recruitingOn: boolean
}

export default function PlayerProfileSettings() {
  const supabase = createClient()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [utrRefreshing, setUtrRefreshing] = useState(false)
  const [utrMessage, setUtrMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const pid = await getLinkedPlayerIdForUser(supabase, user.id)
    if (!pid) {
      setLoading(false)
      return
    }
    setPlayerId(pid)

    const [{ data: player }, { data: prefs }, { data: recruiting }, { data: inputs }] =
      await Promise.all([
        supabase
          .from('players')
          .select('birth_date, sport, skill_level, utr_singles, utr_player_id')
          .eq('id', pid)
          .maybeSingle(),
        supabase
          .from('journey_preferences')
          .select(
            'primary_goal, target_division, target_academic_tier, target_geography, target_state, not_recruiting',
          )
          .eq('player_id', pid)
          .maybeSingle(),
        supabase
          .from('recruiting_profiles')
          .select('grad_year')
          .eq('player_id', pid)
          .maybeSingle(),
        supabase
          .from('journey_score_inputs')
          .select('input_key, value_numeric')
          .eq('player_id', pid)
          .eq('category', 'academics'),
      ])

    const gpa = inputs?.find(i => i.input_key === 'gpa')?.value_numeric
    const sat = inputs?.find(i => i.input_key === 'sat')?.value_numeric
    const act = inputs?.find(i => i.input_key === 'act')?.value_numeric

    const grad = recruiting?.grad_year
    const classYear =
      grad === 2030 && !CLASS_YEARS.includes('2030')
        ? '2030+'
        : grad != null
          ? String(grad)
          : ''

    setForm({
      birthDate: player?.birth_date ?? '',
      classYear,
      sport: player?.sport ?? 'tennis',
      skillLevel: player?.skill_level ?? 'Intermediate',
      utr:
        player?.utr_singles != null ? Number(player.utr_singles) : null,
      utrLinked: Boolean(player?.utr_player_id),
      gpa: gpa != null ? String(gpa) : '',
      sat: sat != null ? String(sat) : '',
      act: act != null ? String(act) : '',
      goal: prefs?.primary_goal ?? '',
      targetDivision: prefs?.target_division ?? '',
      targetAcademicTier: prefs?.target_academic_tier ?? '',
      targetGeography: prefs?.target_geography ?? '',
      targetState: prefs?.target_state ?? '',
      recruitingOn: !(prefs?.not_recruiting ?? false),
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  async function saveField(field: ProfileUpdateField, value: unknown) {
    const res = await fetch('/api/player/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json.error ?? 'Save failed')
    }

    setForm(prev => {
      if (!prev) return prev
      const next = { ...prev }
      switch (field) {
        case 'birth_date':
          next.birthDate = String(value ?? '')
          break
        case 'class_year':
          next.classYear = value === 2030 ? '2030' : String(value ?? '')
          break
        case 'sport':
          next.sport = String(value)
          break
        case 'skill_level':
          next.skillLevel = String(value)
          break
        case 'gpa':
          next.gpa = value != null ? String(value) : ''
          break
        case 'sat':
          next.sat = value != null ? String(value) : ''
          break
        case 'act':
          next.act = value != null ? String(value) : ''
          break
        case 'goal':
          next.goal = String(value)
          break
        case 'target_division':
          next.targetDivision = value != null ? String(value) : ''
          break
        case 'target_academic_tier':
          next.targetAcademicTier = value != null ? String(value) : ''
          break
        case 'target_geography':
          next.targetGeography = value != null ? String(value) : ''
          break
        case 'target_state':
          next.targetState = value != null ? String(value) : ''
          break
        case 'not_recruiting':
          next.recruitingOn = value !== true
          break
      }
      return next
    })
  }

  async function handleRefreshUtr() {
    if (!playerId) return
    setUtrRefreshing(true)
    setUtrMessage(null)
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', playerId }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'UTR refresh failed')
      }
      await load()
      setUtrMessage('UTR updated from your UTR account.')
    } catch (e) {
      setUtrMessage(e instanceof Error ? e.message : 'UTR refresh failed')
    } finally {
      setUtrRefreshing(false)
    }
  }

  usePageReady(!loading)

  if (loading) {
    return null
  }

  if (!form || !playerId) {
    return (
      <div style={{ padding: 24, fontFamily: fonts.sans, color: brand.sub }}>
        No player profile linked to this account.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            fontWeight: 700,
            color: brand.ink,
            margin: '0 0 8px',
          }}
        >
          Profile & Preferences
        </h1>
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: brand.sub,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Update your information. Each field saves when you leave it or change
          a dropdown.
        </p>
      </header>

      <SettingsSection title="Profile">
        <ProfileField
          label="Birth date"
          type="date"
          value={form.birthDate}
          onSave={v => saveField('birth_date', v)}
          helper="Used for USTA bracket math and your UTR trajectory forecast."
        />
        <ProfileField
          label="Class year"
          type="select"
          value={form.classYear}
          options={CLASS_YEARS.map(y => ({ value: y, label: `Class of ${y}` }))}
          onSave={v =>
            saveField(
              'class_year',
              v === '2030+' ? 2030 : v ? Number(v) : null,
            )
          }
          saveOnChange
          helper="Your expected high school graduation year."
        />
      </SettingsSection>

      <SettingsSection title="Tennis">
        <ProfileField
          label="Current UTR"
          type="readonly"
          value={form.utr != null ? form.utr.toFixed(2) : null}
          onSave={async () => {}}
          helper={
            form.utrLinked
              ? 'Synced from your UTR account. Use refresh to pull the latest rating.'
              : 'Link your UTR account from Journey setup or recruiting tools to enable refresh.'
          }
          action={
            form.utrLinked
              ? {
                  label: utrRefreshing ? 'Refreshing…' : 'Refresh from UTR',
                  onClick: handleRefreshUtr,
                }
              : undefined
          }
        />
        {utrMessage ? (
          <p
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              color: utrMessage.includes('failed') ? '#B91C1C' : brand.tealDarkHex,
              margin: '0 0 12px',
            }}
          >
            {utrMessage}
          </p>
        ) : null}
        <ProfileField
          label="Sport"
          type="select"
          value={form.sport}
          options={SPORTS}
          onSave={v => saveField('sport', v)}
          saveOnChange
        />
        <ProfileField
          label="Skill level"
          type="select"
          value={form.skillLevel}
          options={SKILLS}
          onSave={v => saveField('skill_level', v)}
          saveOnChange
        />
      </SettingsSection>

      <SettingsSection title="Academics">
        <ProfileField
          label="GPA"
          type="number"
          value={form.gpa}
          step={0.01}
          min={0}
          max={4.5}
          onSave={v => saveField('gpa', v === '' || v == null ? null : Number(v))}
          helper="Unweighted GPA on a 4.0 scale."
        />
        <ProfileField
          label="SAT score"
          type="number"
          value={form.sat}
          min={400}
          max={1600}
          onSave={v => saveField('sat', v === '' || v == null ? null : Number(v))}
        />
        <ProfileField
          label="ACT score"
          type="number"
          value={form.act}
          min={1}
          max={36}
          onSave={v => saveField('act', v === '' || v == null ? null : Number(v))}
        />
      </SettingsSection>

      <SettingsSection title="Recruiting goals">
        <ProfileField
          label="Primary goal"
          type="select"
          value={form.goal}
          options={GOALS}
          onSave={v => saveField('goal', v)}
          saveOnChange
        />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: fonts.sans,
            fontSize: 14,
            marginTop: 8,
          }}
        >
          <input
            type="checkbox"
            checked={form.recruitingOn}
            onChange={e => void saveField('not_recruiting', !e.target.checked)}
          />
          Show recruiting journey tools
        </label>
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: brand.sub,
            margin: '8px 0 0',
            lineHeight: 1.45,
          }}
        >
          Turn off to hide college matches and recruiting prompts on Journey.
        </p>
      </SettingsSection>

      <SettingsSection title="College targeting">
        <ProfileField
          label="Target division"
          type="select"
          value={form.targetDivision}
          options={DIVISIONS}
          onSave={v => saveField('target_division', v || null)}
          saveOnChange
        />
        <ProfileField
          label="Target academic tier"
          type="select"
          value={form.targetAcademicTier}
          options={ACADEMIC}
          onSave={v => saveField('target_academic_tier', v || null)}
          saveOnChange
        />
        <ProfileField
          label="Target geography"
          type="select"
          value={form.targetGeography}
          options={GEO}
          onSave={v => saveField('target_geography', v || null)}
          saveOnChange
        />
        {(form.targetGeography === 'specific_state' ||
          form.targetState) && (
          <ProfileField
            label="Target state"
            type="text"
            value={form.targetState}
            placeholder="CA"
            onSave={v => saveField('target_state', v || null)}
            helper="Two-letter state code when targeting a specific state."
          />
        )}
      </SettingsSection>
    </div>
  )
}
