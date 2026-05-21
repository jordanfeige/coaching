'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SelectCard, WizardShell } from '@/components/journey-onboarding/WizardShell'

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

export default function TargetingStep() {
  const router = useRouter()
  const [division, setDivision] = useState<string | null>(null)
  const [academic, setAcademic] = useState<string | null>(null)
  const [geo, setGeo] = useState<string | null>(null)
  const [state, setState] = useState('')

  function handleContinue() {
    if (!division || !academic || !geo) return
    sessionStorage.setItem(
      'journey_targeting',
      JSON.stringify({
        division,
        academic_tier: academic,
        geography: geo,
        state: geo === 'specific_state' ? state : null,
      }),
    )
    router.push('/onboarding/journey/finalize')
  }

  return (
    <WizardShell
      step="targeting"
      title="School targeting"
      subtitle="We use this to pick the right academic benchmarks for your score."
      onContinue={handleContinue}
      continueDisabled={!division || !academic || !geo}
    >
      <h3 style={sectionTitle}>College division</h3>
      {DIVISIONS.map(d => (
        <SelectCard
          key={d.value}
          selected={division === d.value}
          onClick={() => setDivision(d.value)}
          title={d.label}
        />
      ))}

      <h3 style={{ ...sectionTitle, marginTop: 20 }}>Academic preference</h3>
      {ACADEMIC.map(a => (
        <SelectCard
          key={a.value}
          selected={academic === a.value}
          onClick={() => setAcademic(a.value)}
          title={a.label}
        />
      ))}

      <h3 style={{ ...sectionTitle, marginTop: 20 }}>Where would you play?</h3>
      {GEO.map(g => (
        <SelectCard
          key={g.value}
          selected={geo === g.value}
          onClick={() => setGeo(g.value)}
          title={g.label}
        />
      ))}
      {geo === 'specific_state' && (
        <input
          placeholder="State (e.g. TX)"
          value={state}
          onChange={e => setState(e.target.value.toUpperCase())}
          style={{
            width: '100%',
            padding: '12px 14px',
            marginTop: 8,
            borderRadius: 10,
            border: '1px solid #E5E7EB',
          }}
        />
      )}
    </WizardShell>
  )
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'Helvetica Neue, sans-serif',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#6B7280',
  margin: '0 0 10px',
}
