'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import AskViaFAB from '@/components/player/ask-via/AskViaFAB'
import AskViaPanel from '@/components/player/ask-via/AskViaPanel'

export type AskViaPayload = {
  prompt: string
  context?: string
}

type AskViaContextValue = {
  isOpen: boolean
  openPanel: (payload?: AskViaPayload) => void
  closePanel: () => void
  askVia: (payload: AskViaPayload) => void
  pageContext: string
  pendingPrompt: string | null
  clearPendingPrompt: () => void
}

const AskViaContext = createContext<AskViaContextValue | null>(null)

const HIDE_PREFIXES = ['/login', '/signup', '/onboarding']

function pageContextFromPath(pathname: string): string {
  const segment = pathname.split('/')[2]
  return segment || 'home'
}

export function AskViaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const [isOpen, setIsOpen] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  const pageContext = pageContextFromPath(pathname)
  const showFab =
    pathname.startsWith('/player') &&
    !HIDE_PREFIXES.some(p => pathname.startsWith(p))

  const closePanel = useCallback(() => {
    setIsOpen(false)
    setPendingPrompt(null)
  }, [])

  const openPanel = useCallback((payload?: AskViaPayload) => {
    if (payload?.prompt) {
      setPendingPrompt(payload.prompt)
    }
    setIsOpen(true)
  }, [])

  const askVia = useCallback(
    (payload: AskViaPayload) => {
      openPanel(payload)
    },
    [openPanel],
  )

  const clearPendingPrompt = useCallback(() => {
    setPendingPrompt(null)
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      openPanel,
      closePanel,
      askVia,
      pageContext,
      pendingPrompt,
      clearPendingPrompt,
    }),
    [
      isOpen,
      openPanel,
      closePanel,
      askVia,
      pageContext,
      pendingPrompt,
      clearPendingPrompt,
    ],
  )

  return (
    <AskViaContext.Provider value={value}>
      {children}
      {showFab && (
        <>
          <AskViaFAB />
          {isOpen && <AskViaPanel onClose={closePanel} />}
        </>
      )}
    </AskViaContext.Provider>
  )
}

export function useAskVia() {
  const ctx = useContext(AskViaContext)
  if (!ctx) {
    throw new Error('useAskVia must be used within AskViaProvider')
  }
  return ctx
}

export function useAskViaOptional() {
  return useContext(AskViaContext)
}
