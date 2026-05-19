'use client'

import type { CSSProperties, ReactNode } from 'react'
import { glass, type GlassMode } from '@/lib/glass'

export function GlassCard({
  children,
  mode = 'light',
  style = {},
}: {
  children: ReactNode
  mode?: GlassMode
  style?: CSSProperties
}) {
  const g = glass[mode]
  return (
    <div style={{ ...g.card, ...style }}>
      <div style={g.specular} />
      {mode === 'via' && <div style={glass.via.sheen} />}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
