'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

export interface AskViaPayload {
  prompt: string
  context: string
}

export interface ViaContextValue {
  askVia: (payload: AskViaPayload) => void
  prefilledPrompt: string | null
  prefilledContext: string | null
  clearPrefill: () => void
}

const ViaContext = createContext<ViaContextValue | null>(null)

export function ViaContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const prevPathRef = useRef(pathname)
  const [prefilledPrompt, setPrefilledPrompt] = useState<string | null>(null)
  const [prefilledContext, setPrefilledContext] = useState<string | null>(null)

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setPrefilledPrompt(null)
      setPrefilledContext(null)
      prevPathRef.current = pathname
    }
  }, [pathname])

  const askVia = useCallback((payload: AskViaPayload) => {
    setPrefilledPrompt(payload.prompt)
    setPrefilledContext(payload.context)
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        const anchor =
          document.getElementById('player-via-top') ??
          document.getElementById('universal-via-bar')
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })
    }
  }, [])

  const clearPrefill = useCallback(() => {
    setPrefilledPrompt(null)
    setPrefilledContext(null)
  }, [])

  return (
    <ViaContext.Provider
      value={{ askVia, prefilledPrompt, prefilledContext, clearPrefill }}
    >
      {children}
    </ViaContext.Provider>
  )
}

export function useViaContext() {
  const ctx = useContext(ViaContext)
  if (!ctx) {
    throw new Error('useViaContext must be used inside ViaContextProvider')
  }
  return ctx
}

export function useViaContextOptional() {
  return useContext(ViaContext)
}
