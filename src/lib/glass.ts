import type { CSSProperties } from 'react'

export const glass = {
  light: {
    card: {
      position: 'relative' as const,
      background: 'rgba(255,255,255,.42)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255,255,255,.52)',
      borderRadius: 20,
      overflow: 'hidden' as const,
    },
    input: {
      background: 'rgba(255,255,255,.42)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '0.5px solid rgba(255,255,255,.60)',
      color: 'rgba(4,52,44,.85)',
    },
    chip: {
      background: 'rgba(255,255,255,.42)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '0.5px solid rgba(255,255,255,.62)',
      color: 'rgba(4,52,44,.78)',
      borderRadius: 999,
    },
    specular: {
      position: 'absolute' as const,
      top: 0,
      left: '8%',
      right: '8%',
      height: 1,
      background: 'rgba(255,255,255,.82)',
      pointerEvents: 'none' as const,
    },
    text: {
      primary: 'rgba(4,52,44,.88)',
      secondary: 'rgba(4,52,44,.55)',
      muted: 'rgba(4,52,44,.40)',
    },
    row: {
      background: 'rgba(255,255,255,.55)',
      border: '0.5px solid rgba(255,255,255,.50)',
      borderRadius: 10,
    },
    scoreBadge: {
      background: 'rgba(255,255,255,.55)',
    },
  },

  dark: {
    card: {
      position: 'relative' as const,
      background: 'rgba(4,20,14,.72)',
      backdropFilter: 'blur(24px) saturate(160%)',
      WebkitBackdropFilter: 'blur(24px) saturate(160%)',
      border: '1px solid rgba(255,255,255,.10)',
      borderRadius: 20,
      overflow: 'hidden' as const,
    },
    input: {
      background: 'rgba(255,255,255,.07)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '0.5px solid rgba(255,255,255,.12)',
      color: 'rgba(255,255,255,.85)',
    },
    chip: {
      background: 'rgba(255,255,255,.08)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '0.5px solid rgba(255,255,255,.14)',
      color: 'rgba(255,255,255,.72)',
      borderRadius: 999,
    },
    specular: {
      position: 'absolute' as const,
      top: 0,
      left: '8%',
      right: '8%',
      height: 1,
      background:
        'linear-gradient(90deg, transparent, rgba(255,255,255,.32) 30%, rgba(255,255,255,.32) 70%, transparent)',
      pointerEvents: 'none' as const,
    },
    text: {
      primary: 'rgba(255,255,255,.88)',
      secondary: 'rgba(255,255,255,.50)',
      muted: 'rgba(255,255,255,.32)',
    },
    row: {
      background: 'rgba(255,255,255,.06)',
      border: '0.5px solid rgba(255,255,255,.10)',
      borderRadius: 10,
    },
  },

  via: {
    card: {
      position: 'relative' as const,
      background: 'rgba(29,158,117,.10)',
      backdropFilter: 'blur(28px) saturate(200%)',
      WebkitBackdropFilter: 'blur(28px) saturate(200%)',
      border: '1px solid rgba(255,255,255,.52)',
      borderRadius: 20,
      overflow: 'hidden' as const,
    },
    playerHome: {
      position: 'relative' as const,
      background: '#ffffff',
      border: '0.5px solid hsl(30,10%,88%)',
      borderRadius: 20,
      overflow: 'hidden' as const,
      boxShadow: '0 2px 12px rgba(29,158,117,.06)',
    },
    blobFrame: {
      background: 'rgba(255,255,255,.28)',
      border: '0.5px solid rgba(255,255,255,.55)',
      borderRadius: 12,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    specular: {
      position: 'absolute' as const,
      top: 0,
      left: '6%',
      right: '6%',
      height: 1,
      background: 'rgba(255,255,255,.85)',
      pointerEvents: 'none' as const,
    },
    sheen: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '42%',
      background: 'linear-gradient(180deg, rgba(255,255,255,.14) 0%, transparent 100%)',
      pointerEvents: 'none' as const,
    },
    mobileBar: {
      background: 'rgba(29,158,117,.12)',
      backdropFilter: 'blur(24px) saturate(200%)',
      WebkitBackdropFilter: 'blur(24px) saturate(200%)',
      borderTop: '1px solid rgba(255,255,255,.45)',
    },
  },

  button: {
    primary: {
      background: 'linear-gradient(135deg, #1D9E75, #085041)',
      border: 'none',
      color: 'white',
      boxShadow: '0 3px 10px rgba(29,158,117,.35)',
    },
  },

  nav: {
    coachSidebar: {
      background: 'rgba(255,255,255,.38)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderRight: '1px solid rgba(255,255,255,.50)',
    },
    coachNavActive: {
      background: 'rgba(29,158,117,.14)',
      border: '0.5px solid rgba(29,158,117,.24)',
      borderRadius: 10,
      color: 'rgba(4,52,44,.88)',
    },
    coachNavInactive: {
      color: 'rgba(4,52,44,.60)',
    },
    playerBottom: {
      background: 'hsl(0,0%,100%)',
      borderTop: '0.5px solid hsl(30,10%,88%)',
    },
    playerNavActive: {
      background: 'rgba(29,158,117,.14)',
      border: '0.5px solid rgba(29,158,117,.24)',
      borderRadius: 10,
      color: 'rgba(4,52,44,.88)',
    },
    playerNavInactive: {
      color: 'rgba(4,52,44,.60)',
    },
    playerNavSpecular: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      background:
        'linear-gradient(90deg, transparent, rgba(255,255,255,.28) 20%, rgba(255,255,255,.28) 80%, transparent)',
      pointerEvents: 'none' as const,
    },
  },
} as const

export type GlassMode = 'light' | 'dark' | 'via'

