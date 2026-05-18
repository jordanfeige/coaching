import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const SPORT_EMOJI: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport') || 'tennis'
  const rating = searchParams.get('rating') || 'Technique report'
  const topIssue = searchParams.get('topIssue') || 'Personalized coaching feedback'
  const name = searchParams.get('name') || 'Athlete'
  const emoji = SPORT_EMOJI[sport.toLowerCase()] || '🎯'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          color: 'white',
          background: 'linear-gradient(135deg, hsl(168, 62%, 36%) 0%, hsl(168, 62%, 28%) 100%)',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 52, fontWeight: 900, letterSpacing: -2 }}>
            <span>Play</span>
            <span style={{ color: 'hsl(168, 62%, 78%)' }}>via</span>
          </div>
          <div
            style={{
              border: '2px solid rgba(255,255,255,0.35)',
              borderRadius: 999,
              padding: '12px 24px',
              fontSize: 30,
              fontWeight: 800,
              textTransform: 'capitalize',
            }}
          >
            {rating}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          <div style={{ fontSize: 150, lineHeight: 1 }}>{emoji}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 32, fontWeight: 700, opacity: 0.85 }}>{name}&apos;s coaching report</div>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>
              {topIssue}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 28 }}>
          <span style={{ opacity: 0.85 }}>AI-powered technique analysis</span>
          <span style={{ fontWeight: 800 }}>Get your free analysis →</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
