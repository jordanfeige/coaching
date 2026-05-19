/** Shared Via panel design tokens — matches Pulse dashboard. */

import type { CSSProperties } from 'react'
import { glass } from '@/lib/glass'

export const VIA_TEAL = '#1D9E75'
export const VIA_TEAL_DARK = '#085041'
export const VIA_BORDER = 'hsl(30,10%,88%)'
export const VIA_TEXT = 'hsl(220,20%,15%)'
export const VIA_TEXT_SEC = 'hsl(220,10%,45%)'
export const VIA_TEXT_MUTED = 'hsl(220,10%,65%)'
export const VIA_WARM_BG = 'hsl(40,20%,97%)'

export const VIA_PANEL_GRADIENT =
  'linear-gradient(135deg, #eaf7f2 0%, #eff3fe 55%, #f4effd 100%)'

export const viaPanelShellStyle: CSSProperties = {
  ...glass.via.card,
  fontFamily: 'Arial, sans-serif',
}

export const viaPanelInputRowStyle: CSSProperties = {
  display: 'flex',
  gap: 7,
  alignItems: 'center',
  ...glass.light.input,
  borderRadius: 10,
  padding: '8px 12px',
}

export const viaBadgeStyle: CSSProperties = {
  fontSize: 10,
  background: 'rgba(29,158,117,.12)',
  color: VIA_TEAL_DARK,
  padding: '2px 8px',
  borderRadius: 999,
  fontWeight: 600,
  border: '0.5px solid rgba(29,158,117,.2)',
  whiteSpace: 'nowrap',
}

export function viaRoleBadgeLabel(role: 'coach' | 'player') {
  return role === 'coach' ? 'AI Coaching Agent' : 'AI Training Assistant'
}

export const VIA_PANEL_KEYFRAMES = `
  @keyframes viaPanelDot {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }
  @keyframes viaPanelBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
`
