'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Send } from 'lucide-react'
import ViaBlob from '@/components/ViaBlob'
import { glass, type GlassMode } from '@/lib/glass'
import { fonts, typography } from '@/lib/brand'
import { VIA_TEAL, viaRoleBadgeLabel } from '@/lib/via-ui'

const VIA_PANEL_KEYFRAMES = `
  @keyframes viaPanelDot {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }
  @keyframes viaPanelBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
  @keyframes viaShimmer {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(220%); }
  }
`

type Role = 'coach' | 'player'
type PanelMode = GlassMode | 'playerVia'

function panelShell(mode: PanelMode): CSSProperties {
  if (mode === 'playerVia') return glass.via.playerHome
  if (mode === 'via') return glass.via.card
  return glass[mode].card
}

function textColors(mode: PanelMode) {
  if (mode === 'dark') return glass.dark.text
  return glass.light.text
}

export function ViaPanelStyles() {
  return <style>{VIA_PANEL_KEYFRAMES}</style>
}

export function ViaPanel({
  children,
  style,
  className,
  onClick,
  mode = 'via',
}: {
  children: ReactNode
  style?: CSSProperties
  className?: string
  onClick?: () => void
  mode?: PanelMode
}) {
  const g = mode === 'via' || mode === 'playerVia' ? glass.via : glass[mode as GlassMode]
  return (
    <div className={className} style={{ ...panelShell(mode), ...style }} onClick={onClick}>
      <div style={g.specular} />
      {(mode === 'via' || mode === 'playerVia') && <div style={glass.via.sheen} />}
      {(mode === 'via' || mode === 'playerVia') && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background:
              'linear-gradient(105deg, transparent 0%, rgba(255,255,255,.12) 45%, transparent 70%)',
            animation: 'viaShimmer 8s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

export function ViaPanelRow({
  children,
  blobSize = 36,
  thinking = false,
  frameBlob = false,
}: {
  children: ReactNode
  blobSize?: number
  thinking?: boolean
  frameBlob?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      {frameBlob ? (
        <div
          style={{
            ...glass.via.blobFrame,
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ViaBlob size={blobSize} thinking={thinking} />
        </div>
      ) : (
        <ViaBlob size={blobSize} thinking={thinking} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

export function ViaPanelTitleRow({
  role,
  trailing,
  mode = 'via',
}: {
  role: Role
  trailing?: ReactNode
  mode?: PanelMode
}) {
  const colors = textColors(mode)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        width: '100%',
      }}
    >
      <span
        style={{
          ...typography.viaName,
          fontSize: 15,
        }}
      >
        Via
      </span>
      <span
        style={{
          fontSize: 10,
          background: 'rgba(29,158,117,.12)',
          color: mode === 'dark' ? 'rgba(93,202,165,.92)' : '#085041',
          padding: '2px 8px',
          borderRadius: 999,
          fontWeight: 600,
          border:
            mode === 'dark'
              ? '0.5px solid rgba(29,158,117,.28)'
              : '0.5px solid rgba(29,158,117,.2)',
          whiteSpace: 'nowrap',
        }}
      >
        {viaRoleBadgeLabel(role)}
      </span>
      {trailing}
    </div>
  )
}

export function ViaPanelHeader(props: {
  role: Role
  blobSize?: number
  thinking?: boolean
  trailing?: ReactNode
  mode?: PanelMode
}) {
  return (
    <ViaPanelRow blobSize={props.blobSize} thinking={props.thinking} frameBlob={true}>
      <ViaPanelTitleRow role={props.role} trailing={props.trailing} mode={props.mode} />
    </ViaPanelRow>
  )
}

export function ViaPanelThinkingDots({
  label,
  mode = 'via',
}: {
  label?: string
  mode?: PanelMode
}) {
  const colors = textColors(mode)
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 12 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: VIA_TEAL,
            opacity: 0.5,
            animation: `viaPanelDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      {label ? (
        <span style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>{label}</span>
      ) : null}
    </div>
  )
}

export function ViaPanelBrief({
  children,
  loading,
  loadingLabel,
  mode = 'via',
}: {
  children: ReactNode
  loading?: boolean
  loadingLabel?: string
  mode?: PanelMode
}) {
  const colors = textColors(mode)
  if (loading) {
    return <ViaPanelThinkingDots label={loadingLabel} mode={mode} />
  }
  return (
    <p
      style={{
        fontSize: 13,
        color: colors.primary,
        lineHeight: 1.65,
        margin: '8px 0 12px',
        maxWidth: 620,
      }}
    >
      {children}
    </p>
  )
}

export function ViaPanelInput({
  value,
  onChange,
  onSend,
  placeholder = 'Ask Via anything...',
  disabled = false,
  maxWidth,
  onClick,
  onFocus,
  mode = 'via',
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder?: string
  disabled?: boolean
  maxWidth?: number | string
  onClick?: () => void
  onFocus?: () => void
  mode?: PanelMode
}) {
  const inputStyle = mode === 'dark' ? glass.dark.input : glass.light.input
  return (
    <div
      style={{
        display: 'flex',
        gap: 7,
        alignItems: 'center',
        ...inputStyle,
        borderRadius: 10,
        padding: '8px 12px',
        maxWidth: maxWidth ?? '100%',
      }}
      onClick={onClick}
    >
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (value.trim() && !disabled) onSend()
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1,
          border: 'none',
          background: 'none',
          fontSize: 12,
          color: inputStyle.color,
          fontFamily: 'Arial, sans-serif',
          outline: 'none',
          minWidth: 0,
        }}
      />
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          if (value.trim() && !disabled) onSend()
        }}
        disabled={!value.trim() || disabled}
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          ...glass.button.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: value.trim() && !disabled ? 'pointer' : 'default',
          flexShrink: 0,
          opacity: value.trim() && !disabled ? 1 : 0.45,
        }}
      >
        <Send size={11} color="white" />
      </button>
    </div>
  )
}

export function ViaPanelChip({
  children,
  onClick,
  mode = 'light',
}: {
  children: ReactNode
  onClick?: () => void
  mode?: 'light' | 'dark'
}) {
  const chip = mode === 'dark' ? glass.dark.chip : glass.light.chip
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...chip,
        fontSize: 11,
        padding: '5px 10px',
        cursor: 'pointer',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  )
}
