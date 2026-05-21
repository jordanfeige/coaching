'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'

/**
 * Client pages may still call usePageReady() after data loads.
 * Visual loading is handled by Next.js `loading.tsx` (PlayviaLoader).
 */
type PageLoadingContextValue = {
  markReady: () => void
  resetReady: () => void
}

const PageLoadingContext = createContext<PageLoadingContextValue | null>(null)

const noop = () => {}

export function usePageLoading() {
  const ctx = useContext(PageLoadingContext)
  if (!ctx) {
    throw new Error('usePageLoading must be used within PageLoadingProvider')
  }
  return ctx
}

export function usePageReady(ready: boolean) {
  const { markReady } = usePageLoading()

  useEffect(() => {
    if (ready) markReady()
  }, [ready, markReady])
}

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ markReady: noop, resetReady: noop }),
    [],
  )

  return (
    <PageLoadingContext.Provider value={value}>
      {children}
    </PageLoadingContext.Provider>
  )
}
