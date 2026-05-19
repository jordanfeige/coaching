export const brand = {
  bg: 'hsl(40, 20%, 97%)',
  card: 'white',
  cardAlt: 'hsl(40, 20%, 96%)',
  border: 'hsl(30, 10%, 88%)',
  teal: 'hsl(168, 62%, 36%)',
  tealLight: 'hsl(168, 62%, 95%)',
  tealDark: 'hsl(168, 62%, 28%)',
  text: 'hsl(220, 20%, 15%)',
  textSecondary: 'hsl(220, 10%, 45%)',
  textMuted: 'hsl(220, 10%, 65%)',
  coral: 'hsl(15, 80%, 60%)',
  coralLight: 'hsl(15, 80%, 95%)',
  blue: 'hsl(210, 80%, 55%)',
  blueLight: 'hsl(210, 80%, 95%)',
  green: 'hsl(145, 60%, 40%)',
  greenLight: 'hsl(145, 60%, 95%)',
  red: 'hsl(0, 70%, 55%)',
  redLight: 'hsl(0, 70%, 95%)',
  amber: 'hsl(38, 92%, 50%)',
  amberLight: 'hsl(38, 92%, 95%)',
} as const

export const fonts = {
  sans: "var(--font-dm-sans), 'DM Sans', system-ui, -apple-system, sans-serif",
  serif: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
  serifItalic: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
  emailSerif: 'Georgia, serif',
} as const

export const typography = {
  wordmark: {
    fontFamily: fonts.serif,
    letterSpacing: '-.3px',
  },
  greeting: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: 400,
    letterSpacing: '-.4px',
    lineHeight: 1.2,
  },
  playerName: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: 400,
    letterSpacing: '-.3px',
  },
  viaName: {
    fontFamily: fonts.serif,
    fontStyle: 'italic' as const,
    color: '#1D9E75',
  },
  sectionHeading: {
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: '-.3px',
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.65,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '.08em',
  },
  nav: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: 400,
  },
  score: {
    fontFamily: fonts.sans,
    fontWeight: 500,
    letterSpacing: '-1px',
  },
} as const
