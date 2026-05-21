'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

type Props = {
  drillId: string
  completedAt?: string | null
  onCompleted?: (completedAt: string) => void
  compact?: boolean
}

export default function MarkDrillCompleteButton({
  drillId,
  completedAt,
  onCompleted,
  compact = false,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(Boolean(completedAt))

  if (done || completedAt) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: compact ? '6px 10px' : '8px 12px',
          borderRadius: 999,
          background: '#F0FDF4',
          border: '1px solid #86EFAC',
          fontFamily: 'system-ui, sans-serif',
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
          color: '#166534',
        }}
      >
        <Check size={14} strokeWidth={2.5} />
        Completed
      </span>
    )
  }

  async function handleComplete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/drills/${drillId}/complete`, { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        completedAt?: string
      }
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not mark complete')
      }
      setDone(true)
      onCompleted?.(data.completedAt ?? new Date().toISOString())
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Could not mark drill complete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleComplete()}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '6px 12px' : '9px 14px',
        borderRadius: 10,
        background: loading ? '#E1F5EE' : '#0F6E56',
        border: 'none',
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? 11 : 13,
        fontWeight: 700,
        color: 'white',
        cursor: loading ? 'wait' : 'pointer',
      }}
    >
      <Check size={14} strokeWidth={2.5} />
      {loading ? 'Saving…' : 'Mark complete'}
    </button>
  )
}
