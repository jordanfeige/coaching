'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { brand, fonts } from '@/lib/brand'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string | null
  children: ReactNode
  /** Stack above another drawer (e.g. assign drill over segment). */
  zIndex?: number
}

export function FilmRoomSideDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  zIndex = 200,
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        justifyContent: 'flex-end',
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
        className="film-room-side-drawer-panel"
        style={{
          position: 'relative',
          width: 'min(65vw, 560px)',
          maxWidth: '100vw',
          height: '100%',
          background: brand.paper,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'filmRoomDrawerIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <style>{`
          @keyframes filmRoomDrawerIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @media (max-width: 1023px) {
            .film-room-side-drawer-panel {
              width: 100vw !important;
            }
          }
        `}</style>

        <div
          style={{
            flexShrink: 0,
            padding: '18px 20px 14px',
            borderBottom: `1px solid ${brand.line}`,
            background: brand.paper,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 20,
                  fontWeight: 600,
                  color: brand.ink,
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {title}
              </h2>
              {subtitle ? (
                <p
                  style={{
                    fontSize: 12,
                    color: brand.muted,
                    margin: '6px 0 0',
                  }}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: brand.lineSoft,
                borderRadius: 8,
                width: 36,
                height: 36,
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0,
                color: brand.ink,
              }}
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </aside>
    </div>
  )
}
