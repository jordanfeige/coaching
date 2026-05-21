'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardShell } from '@/components/journey-onboarding/WizardShell'

type UtrMode = 'verified' | 'self_reported' | 'skipped'

type UtrSearchHit = {
  id: string
  name: string
  singlesUtr: number
  location: string
}

export default function UtrStep() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [results, setResults] = useState<UtrSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [manualUtr, setManualUtr] = useState('')
  const [confirmed, setConfirmed] = useState<{
    mode: UtrMode
    utr?: number
    utr_id?: string
    name?: string
  } | null>(null)

  async function runSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const q = location.trim() ? `${query.trim()} ${location.trim()}` : query.trim()
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: q }),
      })
      const data = await res.json()
      setResults(data.players ?? [])
    } catch (e) {
      console.error(e)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function pickPlayer(p: (typeof results)[0]) {
    setConfirmed({
      mode: 'verified',
      utr: p.singlesUtr,
      utr_id: p.id,
      name: p.name,
    })
  }

  function confirmManual() {
    const utr = parseFloat(manualUtr)
    if (!Number.isFinite(utr) || utr <= 0) return
    setConfirmed({ mode: 'self_reported', utr })
  }

  function skip() {
    setConfirmed({ mode: 'skipped' })
  }

  function handleContinue() {
    if (!confirmed) return
    sessionStorage.setItem('journey_utr', JSON.stringify(confirmed))
    router.push('/onboarding/journey/academics')
  }

  const canContinue = Boolean(confirmed)

  return (
    <WizardShell
      step="utr"
      title="Connect your UTR rating"
      subtitle="Verified UTR from the API carries the most weight in your Journey score."
      onContinue={handleContinue}
      continueDisabled={!canContinue}
    >
      {!confirmed && (
        <>
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            <input
              placeholder="Your name"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="City or state (optional)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={searching || !query.trim()}
              style={btnStyle}
            >
              {searching ? 'Searching...' : 'Search UTR'}
            </button>
          </div>

          {results.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {results.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPlayer(p)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 12,
                    marginBottom: 8,
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {p.location} · UTR {p.singlesUtr.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 12, fontSize: 13, color: '#6B7280' }}>
            Or enter manually
          </div>
          <input
            type="number"
            step="0.01"
            min="1"
            max="16"
            placeholder="UTR (e.g. 7.38)"
            value={manualUtr}
            onChange={e => setManualUtr(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <button type="button" onClick={confirmManual} style={btnOutline}>
            Use self-reported UTR
          </button>
          <button type="button" onClick={skip} style={{ ...btnOutline, marginTop: 8 }}>
            Skip for now
          </button>
        </>
      )}

      {confirmed && (
        <div
          style={{
            background: 'white',
            border: '2px solid #2D9B7F',
            borderRadius: 14,
            padding: 16,
          }}
        >
          {confirmed.mode === 'verified' && (
            <>
              <div
                style={{
                  fontFamily: 'Helvetica Neue, sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0F6E56',
                  marginBottom: 8,
                }}
              >
                ✓ Verified via UTR API
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#111827' }}>
                {confirmed.utr?.toFixed(2)}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                {confirmed.name}
              </div>
            </>
          )}
          {confirmed.mode === 'self_reported' && (
            <div>
              Self-reported UTR: <strong>{confirmed.utr?.toFixed(2)}</strong>
            </div>
          )}
          {confirmed.mode === 'skipped' && (
            <div style={{ color: '#6B7280' }}>
              UTR skipped — you can add it later from settings.
            </div>
          )}
          <button
            type="button"
            onClick={() => setConfirmed(null)}
            style={{
              marginTop: 12,
              background: 'none',
              border: 'none',
              color: '#2D9B7F',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Not me — search again
          </button>
        </div>
      )}
    </WizardShell>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #E5E7EB',
  fontFamily: 'Helvetica Neue, sans-serif',
  fontSize: 14,
}

const btnStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: '#0F6E56',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  fontWeight: 700,
  cursor: 'pointer',
}

const btnOutline: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'white',
  border: '1px solid #E5E7EB',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'Helvetica Neue, sans-serif',
  fontSize: 13,
}
