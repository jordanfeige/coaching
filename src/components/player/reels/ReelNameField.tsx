'use client'

import { normalizeReelTitle } from '@/lib/reel-display'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  hint?: string
  dark?: boolean
}

export function ReelNameField({
  value,
  onChange,
  placeholder = 'e.g. Tournament forehand',
  label = 'Reel name',
  hint,
  dark = false,
}: Props) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: dark ? 9 : 12,
          fontWeight: 600,
          color: dark ? 'rgba(255,255,255,0.6)' : '#888',
          letterSpacing: dark ? '0.08em' : 0,
          textTransform: dark ? 'uppercase' : 'none',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(normalizeReelTitle(e.target.value))}
        placeholder={placeholder}
        maxLength={80}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: dark ? '10px 12px' : '10px 14px',
          borderRadius: 10,
          border: dark
            ? '0.5px solid rgba(255,255,255,0.2)'
            : '0.5px solid rgba(0,0,0,0.1)',
          background: dark ? 'rgba(255,255,255,0.08)' : 'white',
          color: dark ? 'white' : '#111',
          fontSize: 14,
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          outline: 'none',
        }}
      />
      {hint ? (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 11,
            color: dark ? 'rgba(255,255,255,0.45)' : '#888',
            lineHeight: 1.4,
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
