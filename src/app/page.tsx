'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ViaBlob from '@/components/ViaBlob'

const CSS = `
  @keyframes pulseRing {
    0%,100% { opacity: .12; transform: scale(1); }
    50% { opacity: .28; transform: scale(1.06); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes cardPop {
    from { opacity: 0; transform: translateY(14px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes shimmerBar {
    from { width: 0%; }
    to { width: var(--bar-w); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: scale(0.85); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes typing {
    from { width: 0; }
    to { width: 100%; }
  }
  @keyframes blink {
    0%,100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .bar-elbow { animation: shimmerBar 1.2s ease-out 3.8s forwards; width: 0; --bar-w: 42%; }
  .bar-hip { animation: shimmerBar 1.2s ease-out 4.0s forwards; width: 0; --bar-w: 58%; }
  .bar-knee { animation: shimmerBar 1.2s ease-out 4.2s forwards; width: 0; --bar-w: 85%; }
  @media (max-width: 860px) {
    .landing-hero, .pulse-grid, .how-grid { grid-template-columns: 1fr !important; }
    .landing-nav-links { display: none !important; }
    .sport-strip { flex-wrap: wrap; gap: 16px; justify-content: center !important; }
    .pulse-player-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
`

const TEAL = '#1D9E75'
const TEAL_LIGHT = '#E1F5EE'
const TEXT = 'hsl(220,20%,10%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const BORDER = 'hsl(30,10%,88%)'

function ViaDemo() {
  const [step, setStep] = useState(1)

  useEffect(() => {
    let timers: number[] = []

    function runCycle() {
      setStep(1)
      timers = [
        window.setTimeout(() => setStep(2), 1800),
        window.setTimeout(() => setStep(3), 3100),
        window.setTimeout(() => setStep(4), 4300),
      ]
    }

    runCycle()
    const interval = window.setInterval(runCycle, 7600)

    return () => {
      timers.forEach(timer => window.clearTimeout(timer))
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: '0.5px solid hsl(30,10%,93%)',
        }}
      >
        <ViaBlob size={28} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>Via</div>
          <div style={{ fontSize: 10, color: 'hsl(220,10%,60%)' }}>AI Coaching Agent</div>
        </div>
        <div style={{ marginLeft: 'auto', background: TEAL_LIGHT, padding: '2px 8px', borderRadius: 999 }}>
          <span style={{ fontSize: 9, color: '#0F6E56', fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      <div style={{ minHeight: 170 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, animation: 'fadeUp 0.3s ease forwards' }}>
          <div style={{ background: 'hsl(220,20%,96%)', borderRadius: '10px 10px 3px 10px', padding: '8px 12px', maxWidth: '85%' }}>
            <div
              key={`user-${step === 1 ? 'typing' : 'done'}`}
              style={{
                fontSize: 12,
                color: 'hsl(220,20%,20%)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                width: step === 1 ? 0 : '100%',
                animation: step === 1 ? 'typing 1s steps(30) forwards' : 'none',
              }}
            >
              Why is my swing losing power?
            </div>
          </div>
        </div>

        {step === 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', animation: 'fadeUp 0.3s ease forwards' }}>
            <ViaBlob size={28} thinking />
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map(index => (
                <div
                  key={index}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: TEAL,
                    opacity: 0.5,
                    animation: `blink 1.2s ease-in-out ${index * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {step >= 3 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, animation: 'fadeUp 0.4s ease forwards' }}>
            <ViaBlob size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: TEAL, marginBottom: 4 }}>Via</div>
              <div style={{ fontSize: 12, color: 'hsl(220,20%,20%)', lineHeight: 1.55, marginBottom: step >= 4 ? 8 : 0 }}>
                Your elbow measured at <span style={{ color: '#DC2626', fontWeight: 700 }}>52 deg</span> - ideal is
                85-95 deg. That 33 deg deficit is cutting your power at contact.
              </div>
              {step >= 4 && (
                <div
                  style={{
                    background: TEAL_LIGHT,
                    border: '0.5px solid hsl(168,62%,70%)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    animation: 'cardPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', marginBottom: 2 }}>Prescribed by Via</div>
                  <div style={{ fontSize: 11, color: 'hsl(220,20%,20%)' }}>Elbow elevation drill · 3 sets · 15 reps</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MeasurementCard() {
  const measurements = [
    { label: 'Elbow angle', measured: '52 deg', ideal: '85-95 deg', barClass: 'bar-elbow', color: '#DC2626', status: 'critical' },
    { label: 'Hip rotation', measured: '34 deg', ideal: '45-55 deg', barClass: 'bar-hip', color: '#D97706', status: 'warning' },
    { label: 'Knee bend', measured: '148 deg', ideal: '130-160 deg', barClass: 'bar-knee', color: TEAL, status: 'good' },
  ]

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Joint tracking
      </div>

      {measurements.map(measurement => (
        <div key={measurement.label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: TEXT_SEC }}>{measurement.label}</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: measurement.color }}>{measurement.measured}</span>
              <span style={{ fontSize: 10, color: 'hsl(220,10%,65%)' }}>/ {measurement.ideal}</span>
              {measurement.status === 'good' && <span style={{ fontSize: 10, color: TEAL }}>✓</span>}
            </div>
          </div>
          <div style={{ height: 5, background: 'hsl(30,10%,93%)', borderRadius: 3, overflow: 'hidden' }}>
            <div className={measurement.barClass} style={{ height: 5, background: measurement.color, borderRadius: 3 }} />
          </div>
        </div>
      ))}

      <div style={{ borderTop: '0.5px solid hsl(30,10%,93%)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'hsl(220,10%,55%)' }}>Technique score</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'hsl(220,10%,65%)', animation: 'countUp 0.5s ease 4.5s both', opacity: 0 }}>74</span>
          <span style={{ fontSize: 12, color: 'hsl(220,10%,70%)' }}>→</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: TEAL, animation: 'countUp 0.5s ease 4.8s both', opacity: 0 }}>89</span>
          <span style={{ fontSize: 11, color: TEAL, fontWeight: 600, animation: 'fadeUp 0.4s ease 5s both', opacity: 0 }}>+15</span>
        </div>
      </div>
    </div>
  )
}

function PulsePreview() {
  const players = [
    { init: 'O', name: 'Olivia', score: 67, delta: '-4', status: 'attention' },
    { init: 'M', name: 'Marcus', score: 87, delta: '0', status: 'ok' },
    { init: 'N', name: 'Noah', score: 85, delta: '+12', status: 'good' },
    { init: 'A', name: 'Aiden', score: 95, delta: '+3', status: 'levelup' },
    { init: 'S', name: 'Sarah', score: 97, delta: '+10', status: 'levelup' },
  ]
  const statusColor = (status: string) => (status === 'attention' ? '#DC2626' : status === 'levelup' ? '#7C3AED' : TEAL)

  return (
    <div style={{ background: '#04342C', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5DCAA5', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
            Pulse · Coach Dashboard
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Via gives coaches a live view of every player</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All sports', '5 players'].map((label, index) => (
            <div
              key={label}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: index === 1 ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.06)',
                border: `0.5px solid ${index === 1 ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.1)'}`,
                fontSize: 10,
                color: index === 1 ? '#5DCAA5' : 'rgba(255,255,255,0.5)',
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="pulse-player-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 14 }}>
        {players.map(player => (
          <div
            key={player.name}
            style={{
              background: player.status === 'attention' ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.03)',
              border: `0.5px solid ${player.status === 'attention' ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 10,
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${statusColor(player.status)}22`,
                color: statusColor(player.status),
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 6px',
              }}
            >
              {player.init}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>{player.name}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: statusColor(player.status) }}>{player.score}</div>
            <div style={{ fontSize: 9, marginTop: 2, color: `${statusColor(player.status)}bb` }}>
              {player.status === 'attention' ? 'needs help' : player.status === 'levelup' ? 'level up' : player.delta !== '0' ? `${player.delta} pts` : 'on track'}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderLeft: `3px solid ${TEAL}`, padding: '10px 14px', background: 'rgba(29,158,117,0.08)', borderRadius: '0 8px 8px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <ViaBlob size={28} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.55 }}>
          <span style={{ color: '#5DCAA5', fontWeight: 700 }}>Via says:</span> Olivia needs attention - her score dropped 4 points.
          Sarah and Aiden are ready to level up. Schedule a group session around follow through - 3 of 5 players share that issue.
        </p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: 'hsl(40,20%,97%)', minHeight: '100vh' }}>
      <style>{CSS}</style>

      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 40px',
          background: 'rgba(250,249,246,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '0.5px solid hsl(30,10%,90%)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: 'hsl(220,20%,15%)', letterSpacing: '-0.5px' }}>
          Play<span style={{ color: TEAL }}>via</span>
        </div>
        <div className="landing-nav-links" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'hsl(220,10%,55%)' }}>For coaches</span>
          <span style={{ fontSize: 13, color: 'hsl(220,10%,55%)' }}>For players</span>
          <button type="button" onClick={() => router.push('/login')} style={navButtonStyle('white', TEXT)}>
            Sign in
          </button>
          <button type="button" onClick={() => router.push('/onboarding')} style={navButtonStyle(TEAL, 'white', true)}>
            Try free
          </button>
        </div>
      </nav>

      <section
        className="landing-hero"
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '72px 40px 48px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: TEAL_LIGHT, marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL, animation: 'pulseRing 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0F6E56', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Meet Via - AI Coaching Agent
            </span>
          </div>

          <h1 style={{ fontSize: 46, fontWeight: 800, color: TEXT, margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
            The AI coach that watches your video.
          </h1>

          <p style={{ fontSize: 15, color: TEXT_SEC, margin: '0 0 28px', lineHeight: 1.7, maxWidth: 420 }}>
            Via measures your joint angles, identifies exactly what is wrong, and prescribes the specific drills to fix it.
            In under 60 seconds.
          </p>

          <div style={{ marginBottom: 28 }}>
            <ViaDemo />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => router.push('/onboarding')} style={ctaStyle('hsl(220,20%,10%)', 'white')}>
              Add to your Reels
            </button>
            <button type="button" onClick={() => router.push('/onboarding')} style={ctaStyle('white', 'hsl(220,20%,25%)', true)}>
              I&apos;m a coach →
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'hsl(220,10%,65%)', margin: '12px 0 0' }}>
            3 free reels · No credit card · Tennis · Golf · Basketball · Pickleball · Baseball
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              width: 320,
              height: 320,
              background: 'radial-gradient(circle, rgba(29,158,117,0.08) 0%, transparent 70%)',
              borderRadius: '50%',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          />
          <ViaBlob size={140} />
          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <MeasurementCard />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: TEXT, margin: '0 0 10px', letterSpacing: '-0.8px' }}>How Via works</h2>
          <p style={{ fontSize: 14, color: 'hsl(220,10%,50%)', margin: 0 }}>From video to drill plan in under 60 seconds</p>
        </div>
        <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            ['01', 'Film 30 seconds', 'Record yourself from the side. Via works with any phone camera - no special equipment needed.', TEAL_LIGHT, TEAL],
            ['02', 'Via measures your joints', 'Via analyzes elbow angles, hip rotation, knee bend, and more - in exact degrees, not guesses.', '#E6F1FB', '#185FA5'],
            ['03', 'Get your drill plan', 'Via prescribes drills for your specific deficits. No generic advice - everything targets your measurements.', '#EDE9FE', '#7C3AED'],
          ].map(([step, title, body, bg, color]) => (
            <div key={step} style={{ background: 'white', border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: '24px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color }}>{step}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'hsl(220,10%,50%)', margin: 0, lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 80px' }}>
        <div className="pulse-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: TEAL_LIGHT, marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                For coaches
              </span>
            </div>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: TEXT, margin: '0 0 14px', lineHeight: 1.15, letterSpacing: '-0.6px' }}>
              Via watches your whole roster.
            </h2>
            <p style={{ fontSize: 14, color: 'hsl(220,10%,50%)', margin: '0 0 20px', lineHeight: 1.7 }}>
              Pulse gives you a live dashboard of every player&apos;s technique score, trends, and issues. Via tells you who needs attention before your next lesson.
            </p>
            {['Who regressed this week', 'What issue 4 players share', 'Who is ready to be challenged more'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: TEAL }}>✓</span>
                </div>
                <span style={{ fontSize: 13, color: 'hsl(220,20%,25%)' }}>{item}</span>
              </div>
            ))}
            <button type="button" onClick={() => router.push('/onboarding')} style={{ marginTop: 20, ...ctaStyle(TEAL, 'white') }}>
              Start coaching with Via →
            </button>
          </div>
          <PulsePreview />
        </div>
      </section>

      <section style={{ borderTop: `0.5px solid ${BORDER}`, borderBottom: `0.5px solid ${BORDER}`, background: 'white', padding: '20px 40px' }}>
        <div className="sport-strip" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'hsl(220,10%,60%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>5 sports</span>
          {[
            ['🎾', 'Tennis'],
            ['⛳', 'Golf'],
            ['🏀', 'Basketball'],
            ['🏓', 'Pickleball'],
            ['⚾', 'Baseball'],
          ].map(([emoji, name]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220,20%,25%)' }}>{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 600, margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <ViaBlob size={80} />
        </div>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: TEXT, margin: '0 0 14px', letterSpacing: '-1px' }}>
          Your path to better play starts with Via.
        </h2>
        <p style={{ fontSize: 14, color: 'hsl(220,10%,50%)', margin: '0 0 28px', lineHeight: 1.7 }}>
          Create your free account first, then upload your first video. Via will tell you exactly what to work on.
        </p>
        <button type="button" onClick={() => router.push('/onboarding')} style={{ padding: '14px 36px', borderRadius: 14, border: 'none', background: TEAL, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Arial, sans-serif', boxShadow: '0 4px 20px rgba(29,158,117,0.3)' }}>
          Create free account
        </button>
        <p style={{ fontSize: 11, color: 'hsl(220,10%,65%)', margin: '12px 0 0' }}>3 free reels after signup · No credit card required</p>
      </section>

      <footer style={{ borderTop: `0.5px solid ${BORDER}`, padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'hsl(220,20%,15%)', letterSpacing: '-0.4px' }}>
          Play<span style={{ color: TEAL }}>via</span>
        </div>
        <p style={{ fontSize: 11, color: 'hsl(220,10%,65%)', margin: 0 }}>AI Coaching for Modern Athletes · playvia.studio</p>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Privacy', 'Terms', 'Contact'].map(item => (
            <span key={item} style={{ fontSize: 12, color: 'hsl(220,10%,60%)' }}>{item}</span>
          ))}
        </div>
      </footer>
    </div>
  )
}

function navButtonStyle(background: string, color: string, primary = false): React.CSSProperties {
  return {
    padding: primary ? '8px 18px' : '7px 16px',
    borderRadius: 8,
    border: primary ? 'none' : '0.5px solid hsl(30,10%,85%)',
    background,
    color,
    fontSize: 13,
    fontWeight: primary ? 700 : 400,
    cursor: 'pointer',
    fontFamily: 'Arial, sans-serif',
    boxShadow: primary ? '0 2px 12px rgba(29,158,117,0.25)' : undefined,
  }
}

function ctaStyle(background: string, color: string, bordered = false): React.CSSProperties {
  return {
    padding: '13px 24px',
    borderRadius: 12,
    border: bordered ? `0.5px solid ${BORDER}` : 'none',
    background,
    color,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Arial, sans-serif',
  }
}
