'use client'

import ViaBlob from '@/components/ViaBlob'
import { useAskVia } from '@/components/player/ask-via/AskViaContext'

export default function AskViaFAB() {
  const { isOpen, openPanel } = useAskVia()

  if (isOpen) return null

  return (
    <button
      type="button"
      onClick={() => openPanel()}
      aria-label="Ask Via"
      className="ask-via-fab"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
        right: 16,
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: '#0A2A22',
        border: '0.5px solid rgba(93,202,165,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 30,
        color: 'white',
        padding: 0,
        boxShadow: '0 4px 16px rgba(10,42,34,0.35)',
      }}
    >
      <ViaBlob size={24} color="#5DCAA5" />
      <style>{`
        @media (min-width: 1024px) {
          .ask-via-fab {
            bottom: calc(env(safe-area-inset-bottom, 0px) + 24px) !important;
            right: 24px !important;
          }
        }
      `}</style>
    </button>
  )
}
