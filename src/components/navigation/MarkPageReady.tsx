'use client'

import { usePageReady } from '@/contexts/PageLoadingContext'

/** Marks the route overlay done for static or server-rendered pages. */
export default function MarkPageReady({ ready = true }: { ready?: boolean }) {
  usePageReady(ready)
  return null
}
