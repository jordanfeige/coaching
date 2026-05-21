'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GOALS = [
  {
    value: 'recruited_college',
    icon: '🎓',
    label: 'Get recruited to play in college',
    sub: 'I want a college tennis offer — D1, D2, D3, or anywhere I can play',
  },
  {
    value: 'scholarship_smaller',
    icon: '💰',
    label: 'Earn a scholarship to a smaller program',
    sub: 'I want help paying for school through tennis — D2, D3, NAIA, JUCO',
  },
  {
    value: 'win_highest_level',
    icon: '🏆',
    label: 'Win at the highest level I can compete',
    sub: 'Sectionals, states, nationals — performance is what matters',
  },
  {
    value: 'improve_have_fun',
    icon: '🎾',
    label: 'Improve my technique and have fun',
    sub: "I love the game and want to get better — recruiting isn't a focus",
  },
  {
    value: 'help_my_child',
    icon: '👨‍👩‍👧',
    label: 'Help my child enjoy this and get better',
    sub: "I'm a parent — I want to support my kid's development",
  },
  {
    value: 'not_sure_yet',
    icon: '🤔',
    label: "I'm not sure yet",
    sub: "Show me what Playvia can do — I'll figure out my path",
  },
]

export default function GoalPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    if (!selected) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/onboarding/goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primary_goal: selected }),
    })

    const body = (await res.json().catch(() => ({}))) as { error?: string }

    if (!res.ok) {
      setError(body.error || 'Could not save your goal. Please try again.')
      setSaving(false)
      return
    }

    router.push('/onboarding/ready')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F4F0',
        padding: '20px 16px 60px',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 22,
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 20,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            Play<span style={{ color: '#2D9B7F', fontStyle: 'italic' }}>via</span>
          </div>
          <div
            style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 11,
              color: '#6B7280',
              fontWeight: 600,
            }}
          >
            Step 3 of 4
          </div>
        </div>

        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
          }}
        >
          What are you hoping to get out of Playvia?
        </h1>
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: 14.5,
            color: '#6B7280',
            margin: '0 0 22px',
            lineHeight: 1.5,
          }}
        >
          Your answer shapes what Playvia shows you — recruiting tools, performance
          tracking, or just better technique. You can change this anytime.
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          {GOALS.map(g => {
            const isSelected = selected === g.value
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setSelected(g.value)}
                style={{
                  padding: '16px 18px',
                  background: 'white',
                  border: isSelected
                    ? '2px solid #2D9B7F'
                    : '1px solid #E5E7EB',
                  borderRadius: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: isSelected ? '#E1F5EE' : '#FAFAF7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {g.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'Helvetica Neue, sans-serif',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#111827',
                      lineHeight: 1.4,
                      marginBottom: 3,
                    }}
                  >
                    {g.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Helvetica Neue, sans-serif',
                      fontSize: 12.5,
                      color: '#6B7280',
                      lineHeight: 1.5,
                    }}
                  >
                    {g.sub}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {error ? (
          <p
            style={{
              marginTop: 16,
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 13,
              color: '#DC2626',
            }}
          >
            {error}
          </p>
        ) : null}

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selected || saving}
            style={{
              padding: '12px 24px',
              background: selected && !saving ? '#0F6E56' : '#D1D5DB',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              cursor: selected && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving...' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
