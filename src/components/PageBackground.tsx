'use client'

import type { CSSProperties, ReactNode } from 'react'

const WARM_BG = 'hsl(40,20%,97%)'

export default function PageBackground({
  children,
  style = {},
}: {
  mode: 'coach' | 'player'
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: WARM_BG,
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
