'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FinalizeStep() {
  const router = useRouter()
  const [status, setStatus] = useState<'saving' | 'calculating' | 'error' | 'done'>(
    'saving',
  )
  const [error, setError] = useState('')

  useEffect(() => {
    async function run() {
      try {
        const classYear = sessionStorage.getItem('journey_class_year')
        const birthDate = sessionStorage.getItem('journey_birth_date')
        const utr = sessionStorage.getItem('journey_utr')
        const academics = sessionStorage.getItem('journey_academics')
        const tournaments = sessionStorage.getItem('journey_tournaments')
        const targeting = sessionStorage.getItem('journey_targeting')

        setStatus('calculating')

        const res = await fetch('/api/journey/onboarding/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classYear,
            birthDate: birthDate || null,
            utr: utr ? JSON.parse(utr) : null,
            academics: academics ? JSON.parse(academics) : null,
            tournaments: tournaments ? JSON.parse(tournaments) : null,
            targeting: targeting ? JSON.parse(targeting) : null,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Finalize failed')
        }

        sessionStorage.setItem('journey_first_reveal', 'true')
        setStatus('done')
        router.push('/player/journey')
      } catch (e) {
        setStatus('error')
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    }

    run()
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F4F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#2D9B7F',
            margin: '0 auto 20px',
            animation: 'pulse 1.2s ease-in-out infinite',
          }}
        />
        <h1 style={{ fontSize: 24, margin: '0 0 12px' }}>
          Computing your Journey Rating...
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          {status === 'saving' && 'Saving your profile...'}
          {status === 'calculating' && 'Running the score engine...'}
          {status === 'error' && error}
        </p>
        {status === 'error' && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '10px 20px',
              background: '#0F6E56',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
