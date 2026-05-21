'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardShell } from '@/components/journey-onboarding/WizardShell'

export default function AcademicsStep() {
  const router = useRouter()
  const [gpa, setGpa] = useState('')
  const [sat, setSat] = useState('')

  function handleContinue() {
    sessionStorage.setItem(
      'journey_academics',
      JSON.stringify({
        gpa: gpa ? parseFloat(gpa) : null,
        sat: sat ? parseInt(sat, 10) : null,
      }),
    )
    router.push('/onboarding/journey/tournaments')
  }

  return (
    <WizardShell
      step="academics"
      title="Academic profile"
      subtitle="Optional — improves your academic readiness score."
      onContinue={handleContinue}
    >
      <label style={labelStyle}>GPA (optional)</label>
      <input
        type="number"
        step="0.01"
        min="0"
        max="4.5"
        value={gpa}
        onChange={e => setGpa(e.target.value)}
        placeholder="e.g. 3.4"
        style={inputStyle}
      />
      <label style={{ ...labelStyle, marginTop: 16 }}>SAT (optional)</label>
      <input
        type="number"
        min="400"
        max="1600"
        value={sat}
        onChange={e => setSat(e.target.value)}
        placeholder="e.g. 1180"
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
