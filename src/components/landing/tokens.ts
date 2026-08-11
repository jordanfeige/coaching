import { brand, fonts } from '@/lib/brand'

export const landing = {
  bg: brand.paper,
  surface: '#FFFFFF',
  ink: brand.ink,
  sub: brand.sub,
  muted: brand.muted,
  border: brand.line,
  borderSoft: brand.lineSoft,
  teal: brand.tealDarkHex,
  tealBright: '#1D9E75',
  tealTint: brand.tealTint,
  tealDeep: brand.tealDeep,
  warm: brand.warm,
  warmTint: brand.warmTint,
  fontSans: fonts.sans,
  fontSerif: fonts.serif,
} as const

export const landingCss = `
  @keyframes landingFadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .landing-root {
    font-family: ${fonts.sans};
    background: ${brand.paper};
    color: ${brand.ink};
    min-height: 100vh;
  }
  .landing-section {
    max-width: 1120px;
    margin: 0 auto;
    padding: 88px 40px;
  }
  .landing-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${brand.tealDarkHex};
  }
  .landing-h1 {
    font-family: ${fonts.serif};
    font-size: clamp(36px, 5vw, 56px);
    font-weight: 400;
    letter-spacing: -0.03em;
    line-height: 1.08;
    color: ${brand.ink};
    margin: 0;
  }
  .landing-h2 {
    font-family: ${fonts.serif};
    font-size: clamp(28px, 3.5vw, 40px);
    font-weight: 400;
    letter-spacing: -0.025em;
    line-height: 1.15;
    color: ${brand.ink};
    margin: 0;
  }
  .landing-lead {
    font-size: 17px;
    line-height: 1.65;
    color: ${brand.sub};
    margin: 0;
  }
  .landing-body {
    font-size: 15px;
    line-height: 1.7;
    color: ${brand.sub};
    margin: 0;
  }
  .landing-product-shell {
    background: #0B1411;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(6, 61, 49, 0.22);
  }
  .landing-product-chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.03);
  }
  .landing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
  }
  .landing-two-col > div:first-child {
    border-right: 1px solid ${brand.line};
  }
  .landing-product-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .landing-product-split {
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    gap: 12px;
  }
  @media (max-width: 900px) {
    .landing-section { padding: 64px 20px; }
    .landing-hero-grid,
    .landing-two-col,
    .landing-steps,
    .landing-platform,
    .landing-coach-grid,
    .landing-honest-grid,
    .landing-product-split {
      grid-template-columns: 1fr !important;
    }
    .landing-product-stats {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .landing-two-col > div:first-child {
      border-right: none !important;
      border-bottom: 1px solid ${brand.line};
    }
    .landing-nav-links { display: none !important; }
  }
`
