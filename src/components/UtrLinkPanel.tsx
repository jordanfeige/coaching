'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { UTRSearchPlayer } from '@/lib/utr'

const TEAL = '#1D9E75'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const WARM_BG = 'hsl(40,20%,97%)'

type Props = {
  playerId: string
  playerName: string
  utrPlayerId?: string | null
  utrSingles?: number | null
  utrDoubles?: number | null
  utrDisplayName?: string | null
  lastSyncedAt?: string | null
  onUpdated?: () => void | Promise<void>
}

export default function UtrLinkPanel({
  playerId,
  playerName,
  utrPlayerId,
  utrSingles,
  utrDoubles,
  utrDisplayName,
  lastSyncedAt,
  onUpdated,
}: Props) {
  const [utrSearch, setUtrSearch] = useState(playerName)
  const [utrResults, setUtrResults] = useState<UTRSearchPlayer[]>([])
  const [utrSearching, setUtrSearching] = useState(false)
  const [utrSyncing, setUtrSyncing] = useState(false)
  const [utrError, setUtrError] = useState('')
  const [showLinkForm, setShowLinkForm] = useState(!utrPlayerId)

  useEffect(() => {
    if (!utrPlayerId) setShowLinkForm(true)
  }, [utrPlayerId])

  async function searchUTR() {
    if (!utrSearch.trim()) return
    setUtrSearching(true)
    setUtrResults([])
    setUtrError('')
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: utrSearch.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setUtrResults(data.players ?? [])
      } else {
        setUtrError(data.error || 'Search failed')
      }
    } catch (e) {
      setUtrError(e instanceof Error ? e.message : 'Search failed')
    }
    setUtrSearching(false)
  }

  async function linkUTR(utrPlayer: UTRSearchPlayer) {
    setUtrSyncing(true)
    setUtrError('')
    setUtrResults([])
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          utrPlayerId: String(utrPlayer.id),
          playerId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowLinkForm(false)
        setUtrSearch('')
        await onUpdated?.()
      } else {
        setUtrError(data.error || 'Link failed')
      }
    } catch (e) {
      setUtrError(e instanceof Error ? e.message : 'Link failed')
    }
    setUtrSyncing(false)
  }

  async function syncUTR() {
    setUtrSyncing(true)
    setUtrError('')
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', playerId }),
      })
      const data = await res.json()
      if (data.success) {
        await onUpdated?.()
      } else {
        setUtrError(data.error || 'Sync failed')
      }
    } catch (e) {
      setUtrError(e instanceof Error ? e.message : 'Sync failed')
    }
    setUtrSyncing(false)
  }

  async function unlinkUTR() {
    if (!confirm('Unlink your UTR account? Ratings will be removed until you link again.')) {
      return
    }
    setUtrSyncing(true)
    setUtrError('')
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink', playerId }),
      })
      const data = await res.json()
      if (data.success) {
        setShowLinkForm(true)
        setUtrSearch(playerName)
        await onUpdated?.()
      } else {
        setUtrError(data.error || 'Unlink failed')
      }
    } catch (e) {
      setUtrError(e instanceof Error ? e.message : 'Unlink failed')
    }
    setUtrSyncing(false)
  }

  const linked = Boolean(utrPlayerId)

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '.07em',
          }}
        >
          UTR account
        </div>
        {linked && !showLinkForm ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => void syncUTR()}
              disabled={utrSyncing}
              style={{
                padding: '4px 10px',
                borderRadius: 7,
                border: `0.5px solid ${BORDER}`,
                background: 'white',
                fontSize: 11,
                color: TEXT_MUTED,
                cursor: utrSyncing ? 'default' : 'pointer',
              }}
            >
              {utrSyncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkForm(true)
                setUtrSearch(playerName)
              }}
              disabled={utrSyncing}
              style={{
                padding: '4px 10px',
                borderRadius: 7,
                border: `0.5px solid ${BORDER}`,
                background: 'white',
                fontSize: 11,
                color: TEXT_MUTED,
                cursor: utrSyncing ? 'default' : 'pointer',
              }}
            >
              Re-link
            </button>
          </div>
        ) : null}
      </div>

      {linked && !showLinkForm ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: '#E1F5EE',
            borderRadius: 10,
            border: '0.5px solid #9FE1CB',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: '#085041',
                lineHeight: 1,
              }}
            >
              {utrSingles != null ? Number(utrSingles).toFixed(2) : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 2 }}>
              UTR Singles
              {utrDoubles != null && Number(utrDoubles) > 0
                ? ` · Doubles ${Number(utrDoubles).toFixed(2)}`
                : ''}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            {utrDisplayName ? (
              <div style={{ fontSize: 11, color: TEXT_SEC, marginBottom: 4 }}>
                {utrDisplayName}
              </div>
            ) : null}
            {lastSyncedAt ? (
              <div style={{ fontSize: 10, color: TEXT_MUTED }}>
                Synced{' '}
                {formatDistanceToNow(new Date(lastSyncedAt), {
                  addSuffix: true,
                })}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void unlinkUTR()}
              disabled={utrSyncing}
              style={{
                marginTop: 6,
                padding: 0,
                border: 'none',
                background: 'none',
                fontSize: 10,
                color: TEXT_MUTED,
                textDecoration: 'underline',
                cursor: utrSyncing ? 'default' : 'pointer',
              }}
            >
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <>
          <p
            style={{
              fontSize: 12,
              color: TEXT_MUTED,
              marginBottom: 10,
              lineHeight: 1.55,
            }}
          >
            Link your UTR account to sync ratings and schedule strength into
            recruiting and Journey.
          </p>
          <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
            <input
              value={utrSearch}
              onChange={e => setUtrSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void searchUTR()
              }}
              placeholder={`Search "${playerName}" on UTR`}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 9,
                border: `0.5px solid ${BORDER}`,
                background: WARM_BG,
                fontSize: 13,
                color: TEXT,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => void searchUTR()}
              disabled={utrSearching || !utrSearch.trim()}
              style={{
                padding: '9px 16px',
                borderRadius: 9,
                background: utrSearching ? BORDER : TEAL,
                border: 'none',
                color: 'white',
                fontSize: 12,
                fontWeight: 500,
                cursor: utrSearching ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              {utrSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {linked && showLinkForm ? (
            <button
              type="button"
              onClick={() => setShowLinkForm(false)}
              style={{
                marginBottom: 8,
                padding: 0,
                border: 'none',
                background: 'none',
                fontSize: 11,
                color: TEXT_MUTED,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Cancel
            </button>
          ) : null}
          {utrResults.length > 0 ? (
            <div
              style={{
                border: `0.5px solid ${BORDER}`,
                borderRadius: 10,
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              {utrResults.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 13px',
                    borderTop: i > 0 ? `0.5px solid ${BORDER}` : 'none',
                    background: i % 2 === 0 ? 'white' : WARM_BG,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: TEXT,
                        marginBottom: 1,
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                      UTR {p.singlesUtr > 0 ? p.singlesUtr.toFixed(2) : '—'}
                      {p.location ? ` · ${p.location}` : ''}
                      {p.gradYear ? ` · Class of ${p.gradYear}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void linkUTR(p)}
                    disabled={utrSyncing}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: utrSyncing ? BORDER : TEAL,
                      border: 'none',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: utrSyncing ? 'default' : 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {utrSyncing ? 'Linking...' : 'Link →'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}

      {utrError ? (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '0.5px solid #FCA5A5',
            fontSize: 11,
            color: '#A32D2D',
            marginTop: 6,
          }}
        >
          {utrError}
        </div>
      ) : null}
    </div>
  )
}
