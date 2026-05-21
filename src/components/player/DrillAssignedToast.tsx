'use client'

import Link from 'next/link'

type Props = {
  onDismiss: () => void
}

export default function DrillAssignedToast({ onDismiss }: Props) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 88,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        width: 'min(360px, calc(100vw - 32px))',
        background: '#04342C',
        color: 'white',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        Drill added to your training
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link
          href="/player/training#drills"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#5DCAA5',
            textDecoration: 'none',
          }}
          onClick={onDismiss}
        >
          View
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,.5)',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
