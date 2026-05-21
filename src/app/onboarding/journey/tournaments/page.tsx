'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardShell } from '@/components/journey-onboarding/WizardShell'

export default function TournamentsStep() {
  const router = useRouter()
  const [count, setCount] = useState('')

  function handleContinue() {
    sessionStorage.setItem(
      'journey_tournaments',
      JSON.stringify({
        count: count !== '' ? parseInt(count, 10) : null,
      }),
    )
    router.push('/onboarding/journey/targeting')
  }

  return (
    <WizardShell
      step="tournaments"
      title="Tournament schedule"
      subtitle="Sanctioned events in the last 12 months."
      onContinue={handleContinue}
    >
      <label style={labelStyle}>Sanctioned tournaments (12 months)</label>
      <input
        type="number"
        min="0"
        max="24"
        value={count}
        onChange={e => setCount(e.target.value)}
        placeholder="e.g. 4"
        style={inputStyle}
      />
    </WizardShell>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Helvetica Neue, sans-serif',
  fontSize: 12,
  fontWeight: 700,
  color: '#374151',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #E5E7EB',
  fontFamily: 'Helvetica Neue, sans-serif',
  fontSize: 14,
}
