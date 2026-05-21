'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SelectCard, WizardShell } from '@/components/journey-onboarding/WizardShell'

const YEARS = ['2026', '2027', '2028', '2029', '2030+']

const todayIso = new Date().toISOString().split('T')[0]

export default function ClassYearStep() {
  const router = useRouter()
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [year, setYear] = useState<string | null>(null)

  function handleContinue() {
    if (!year) return
    if (birthDate) {
      sessionStorage.setItem('journey_birth_date', birthDate)
    } else {
      sessionStorage.removeItem('journey_birth_date')
    }
    sessionStorage.setItem('journey_class_year', year)
    router.push('/onboarding/journey/utr')
  }

  return (
    <WizardShell
      step="class-year"
      title="A few more details"
      subtitle="Birth date helps us project your UTR trajectory. Class year sets your recruiting class."
      onContinue={handleContinue}
      continueDisabled={!year}
    >
      <div style={{ marginBottom: 20 }}>
        <label
          htmlFor="birth_date"
          style={{
            display: 'block',
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 8,
          }}
        >
          Birth date
          <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none' }}>
            {' '}
            — optional, improves trajectory accuracy
          </span>
        </label>
        <input
          id="birth_date"
          type="date"
          value={birthDate ?? ''}
          onChange={e => setBirthDate(e.target.value || null)}
          max={todayIso}
          min="1970-01-01"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 14,
            color: '#111827',
            background: 'white',
            boxSizing: 'border-box',
          }}
        />
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 12,
            fontStyle: 'italic',
            color: '#6B7280',
            margin: '6px 0 0',
            lineHeight: 1.5,
          }}
        >
          We use this for USTA bracket math and to project your UTR to graduation.
          You can skip and add it later in settings.
        </p>
      </div>

      <h3 style={sectionTitle}>High school graduation</h3>
      {YEARS.map(y => (
        <SelectCard
          key={y}
          selected={year === y}
          onClick={() => setYear(y)}
          title={`Class of ${y}`}
        />
      ))}
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
