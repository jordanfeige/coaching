'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { brand } from '@/lib/brand'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  segmentIndex: number
  segmentTotal: number
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  canNext: boolean
  children: ReactNode
  footer?: ReactNode
}

export function MatchFilmDrawer({
  open,
  onClose,
  title,
  subtitle,
  segmentIndex,
  segmentTotal,
  onPrev,
  onNext,
  canPrev,
  canNext,
  children,
  footer,
}: Props) {
  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, handleClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="match-film-drawer-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
      }}
    >
      <button
        type="button"
        aria-label="Close drawer"
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <aside
        className="match-film-drawer-panel"
        style={{
          position: 'relative',
          width: 'min(65vw, 440px)',
          maxWidth: '100vw',
          height: '100%',
          background: brand.paper,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'matchFilmDrawerIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <style>{`
          @keyframes matchFilmDrawerIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @media (max-width: 1023px) {
            .match-film-drawer-panel {
              width: 100vw !important;
            }
          }
        `}</style>

        <div
          style={{
            flexShrink: 0,
            padding: '16px 18px 12px',
            borderBottom: `0.5px solid ${brand.line}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: brand.ink }}>
                {title}
              </p>
              {subtitle ? (
                <p style={{ fontSize: 11, color: brand.muted, margin: '4px 0 0' }}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                disabled={!canPrev}
                onClick={onPrev}
                aria-label="Previous segment"
                style={navBtnStyle(!canPrev)}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 11, color: brand.sub, whiteSpace: 'nowrap' }}>
                {segmentIndex + 1} of {segmentTotal}
              </span>
              <button
                type="button"
                disabled={!canNext}
                onClick={onNext}
                aria-label="Next segment"
                style={navBtnStyle(!canNext)}
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                style={{
                  ...navBtnStyle(false),
                  marginLeft: 4,
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>

        {footer ? (
          <div
            style={{
              flexShrink: 0,
              padding: '12px 18px 18px',
              borderTop: `0.5px solid ${brand.line}`,
            }}
          >
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  )
}

function navBtnStyle(disabled: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `0.5px solid ${brand.line}`,
    background: brand.card,
    color: disabled ? brand.muted : brand.ink,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    padding: 0,
  } as const
}
