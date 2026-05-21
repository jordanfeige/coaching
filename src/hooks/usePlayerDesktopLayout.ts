'use client'

import { useEffect, useState } from 'react'
import { layout } from '@/lib/brand'

/** Match Tailwind `lg` (64rem) and globals.css player layout breakpoints. */
export const PLAYER_DESKTOP_MEDIA = `(min-width: ${layout.desktopMinWidth}px)`

function readIsDesktop() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(PLAYER_DESKTOP_MEDIA).matches
}

export function usePlayerDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(readIsDesktop)

  useEffect(() => {
    const mq = window.matchMedia(PLAYER_DESKTOP_MEDIA)
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return isDesktop
}
