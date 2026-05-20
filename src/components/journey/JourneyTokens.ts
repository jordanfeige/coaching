export const TOKENS = {
  TEAL: '#2D9B7F',
  TEAL_DARK: '#0F6E56',
  TEAL_DEEP: '#063D31',
  TEAL_TINT: '#E1F5EE',
  CREAM: '#F5F4F0',
  PAPER: '#FAFAF7',
  INK: '#111827',
  SUB: '#6B7280',
  MUTED: '#9CA3AF',
  LINE: '#E5E7EB',
  LINE_SOFT: '#F3F4F6',
  WARM: '#854F0B',
  WARM_TINT: '#FAEEDA',
  BLUE: '#185FA5',
  BLUE_TINT: '#E6F1FB',
  PLUM: '#534AB7',
  PLUM_TINT: '#EEEDFE',
  RUST: '#993C1D',
  RUST_TINT: '#FDEBE0',
  AMBER: '#B45309',
  AMBER_TINT: '#FEF3C7',
  GREEN: '#047857',
  GREEN_TINT: '#D1FAE5',
} as const

export const FONTS = {
  serif: "'Georgia', 'Times New Roman', serif",
  sans: "'Helvetica Neue', Arial, sans-serif",
} as const

export const CATEGORY_COLORS: Record<string, { color: string; tint: string }> = {
  tennis: { color: TOKENS.TEAL_DARK, tint: TOKENS.TEAL_TINT },
  academics: { color: TOKENS.BLUE, tint: TOKENS.BLUE_TINT },
  exposure: { color: TOKENS.WARM, tint: TOKENS.WARM_TINT },
  coachability: { color: TOKENS.PLUM, tint: TOKENS.PLUM_TINT },
}

export const SEVERITY_COLORS = {
  critical: { color: TOKENS.RUST, tint: TOKENS.RUST_TINT, label: 'Critical' },
  important: { color: TOKENS.AMBER, tint: TOKENS.AMBER_TINT, label: 'Important' },
  minor: { color: TOKENS.BLUE, tint: TOKENS.BLUE_TINT, label: 'Minor' },
  done: { color: TOKENS.GREEN, tint: TOKENS.GREEN_TINT, label: 'Complete' },
} as const
