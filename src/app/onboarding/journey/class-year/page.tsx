'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SelectCard, WizardShell } from '@/components/journey-onboarding/WizardShell'

const YEARS = ['2026', '2027', '2028', '2029', '2030+']

export default function ClassYearStep() {
  const router = useRouter()
  const [year, setYear] = useState<string | null>(null)

  function handleContinue() {
    if (!year) return
    sessionStorage.setItem('journey_class_year', year)
    router.push('/onboarding/journey/utr')
  }

  return (
    <WizardShell
      step="class-year"
      title="What year do you graduate high school?"
      subtitle="This helps us compare you to the right recruiting class."
      onContinue={handleContinue}
      continueDisabled={!year}
    >
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
