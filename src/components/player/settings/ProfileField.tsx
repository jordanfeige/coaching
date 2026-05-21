'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { brand, fonts } from '@/lib/brand'

type SelectOption = { value: string; label: string }

type Props = {
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'readonly'
  value: string | number | null
  onSave: (value: string | number | boolean | null) => Promise<void>
  helper?: string
  options?: SelectOption[]
  action?: { label: string; onClick: () => void | Promise<void> }
  step?: number
  min?: number
  max?: number
  placeholder?: string
  saveOnChange?: boolean
}

export default function ProfileField({
  label,
  type,
  value,
  onSave,
  helper,
  options,
  action,
  step,
  min,
  max,
  placeholder,
  saveOnChange = false,
}: Props) {
  const display =
    value == null || value === '' ? '' : String(value)
  const [local, setLocal] = useState(display)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocal(display)
  }, [display])

  async function commit(next?: string) {
    const raw = next ?? local
    if (raw === display) return

    setSaving(true)
    setError(null)
    try {
      let parsed: string | number | boolean | null = raw
      if (type === 'number' && raw !== '') {
        parsed = Number(raw)
      }
      if (type === 'select' && raw === '') {
        parsed = null
      }
      await onSave(parsed)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setLocal(display)
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <label
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            fontWeight: 700,
            color: brand.ink,
          }}
        >
          {label}
        </label>
        {saved ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: fonts.sans,
              fontSize: 11,
              fontWeight: 700,
              color: brand.tealDarkHex,
            }}
          >
            <Check size={14} />
            Saved
          </span>
        ) : saving ? (
          <span style={{ fontFamily: fonts.sans, fontSize: 11, color: brand.muted }}>
            Saving…
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {type === 'readonly' ? (
          <div
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${brand.line}`,
              background: brand.lineSoft,
              fontFamily: fonts.sans,
              fontSize: 14,
              fontWeight: 700,
              color: brand.ink,
            }}
          >
            {display || '—'}
          </div>
        ) : type === 'select' ? (
          <select
            value={local}
            onChange={e => {
              setLocal(e.target.value)
              if (saveOnChange) void commit(e.target.value)
            }}
            onBlur={() => {
              if (!saveOnChange) void commit()
            }}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${brand.line}`,
              fontFamily: fonts.sans,
              fontSize: 14,
              background: 'white',
            }}
          >
            <option value="">—</option>
            {options?.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            value={local}
            step={step}
            min={min}
            max={max}
            placeholder={placeholder}
            onChange={e => setLocal(e.target.value)}
            onBlur={() => void commit()}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${brand.line}`,
              fontFamily: fonts.sans,
              fontSize: 14,
              background: 'white',
            }}
          />
        )}

        {action ? (
          <button
            type="button"
            onClick={() => void action.onClick()}
            disabled={saving}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${brand.tealHex}`,
              background: brand.tealTint,
              fontFamily: fonts.sans,
              fontSize: 12,
              fontWeight: 700,
              color: brand.tealDarkHex,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {action.label}
          </button>
        ) : null}
      </div>

      {helper ? (
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: brand.sub,
            margin: '6px 0 0',
            lineHeight: 1.45,
          }}
        >
          {helper}
        </p>
      ) : null}

      {error ? (
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: '#B91C1C',
            margin: '6px 0 0',
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        background: 'white',
        border: `1px solid ${brand.line}`,
        borderRadius: 16,
        padding: '20px 22px',
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: brand.sub,
          margin: '0 0 16px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

export { SettingsSection }
