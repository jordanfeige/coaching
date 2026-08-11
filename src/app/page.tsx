'use client'

import Link from 'next/link'
import { WaitlistForm } from '@/components/waitlist/WaitlistForm'
import { PracticeOverviewMock } from '@/components/landing/PracticeOverviewMock'
import { EvidenceMock } from '@/components/landing/EvidenceMock'
import { HonestAiPanel } from '@/components/landing/HonestAiPanel'
import { ObservationPanel } from '@/components/landing/ObservationPanel'
import { CoachRosterMock } from '@/components/landing/CoachRosterMock'
import { landing, landingCss } from '@/components/landing/tokens'

const STEPS = [
  {
    n: '01',
    title: 'Capture',
    body: 'Record practice like you already do.',
    detail: 'No special equipment. No complicated setup.',
  },
  {
    n: '02',
    title: 'Understand',
    body: 'Playvia turns video into structured events.',
    detail: 'Players, shots, movement, court position, practice segments and more.',
  },
  {
    n: '03',
    title: 'Explore',
    body: 'Every number connects back to the video.',
    detail: 'Tap a stat to see the clips behind it.',
  },
  {
    n: '04',
    title: 'Improve',
    body: 'Turn observations into better coaching.',
    detail:
      'Structured intelligence helps coaches understand what happened — and where to focus next.',
  },
]

const PLATFORM = [
  {
    title: 'Practice Intelligence',
    body: 'See what happened. Understand activity, shot volume, movement, positioning and observable patterns.',
  },
  {
    title: 'Match Intelligence',
    body: 'Understand what happened in context. Connect performance to outcomes, score context, pressure, rally length, errors, serve placement and other match-specific signals.',
  },
  {
    title: 'Coaching Intelligence',
    body: 'Know where to focus next. Build a longitudinal understanding of players across practices and matches and identify meaningful areas of focus.',
  },
]

const SPORTS = ['Tennis', 'Golf', 'Basketball', 'Pickleball', 'Baseball']

const PROBLEMS = [
  'Who was moving?',
  'How much did each player hit?',
  'What types of shots did they hit?',
  'Where were they hitting from?',
  'What changed during practice?',
  'What patterns emerged?',
]

function PrimaryCta({ href = '#early-access' }: { href?: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '13px 22px',
        borderRadius: 10,
        background: landing.ink,
        color: '#fff',
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none',
        letterSpacing: '-0.01em',
      }}
    >
      Get Early Access →
    </a>
  )
}

function SecondaryCta({ href = '#product' }: { href?: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '13px 22px',
        borderRadius: 10,
        background: 'transparent',
        color: landing.ink,
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none',
        border: `1px solid ${landing.border}`,
      }}
    >
      See Playvia in Action
    </a>
  )
}

export default function LandingPage() {
  return (
    <div className="landing-root">
      <style>{landingCss}</style>

      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 40px',
          background: 'rgba(250,250,247,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${landing.border}`,
        }}
      >
        <a href="#" style={{ textDecoration: 'none', color: landing.ink }}>
          <span
            style={{
              fontFamily: landing.fontSerif,
              fontSize: 24,
              letterSpacing: '-0.03em',
            }}
          >
            Play<span style={{ color: landing.tealBright, fontStyle: 'italic' }}>via</span>
          </span>
        </a>

        <div
          className="landing-nav-links"
          style={{ display: 'flex', alignItems: 'center', gap: 28 }}
        >
          {[
            ['Product', '#product'],
            ['For Coaches', '#coaches'],
            ['For Athletes', '#athletes'],
            ['Platform', '#platform'],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: landing.sub,
                textDecoration: 'none',
              }}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/login"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: landing.ink,
              textDecoration: 'none',
              padding: '8px 12px',
            }}
          >
            Sign In
          </Link>
          <a
            href="#early-access"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: landing.teal,
              textDecoration: 'none',
              padding: '9px 16px',
              borderRadius: 9,
            }}
          >
            Get Early Access
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section
        className="landing-section landing-hero-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.05fr',
          gap: 48,
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 72,
        }}
      >
        <div>
          <p className="landing-eyebrow" style={{ marginBottom: 16 }}>
            Sports Intelligence
          </p>
          <h1 className="landing-h1" style={{ marginBottom: 18 }}>
            See more. Understand more. Coach better.
          </h1>
          <p className="landing-lead" style={{ marginBottom: 14, maxWidth: 480 }}>
            Playvia turns sports video into intelligence — transforming practices
            and matches into structured, evidence-backed insights about every
            player.
          </p>
          <p
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: landing.ink,
              margin: '0 0 28px',
            }}
          >
            Structured intelligence for every practice and match.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <PrimaryCta />
            <SecondaryCta />
          </div>
        </div>
        <div id="product">
          <PracticeOverviewMock />
        </div>
      </section>

      {/* PROBLEM */}
      <section
        style={{
          background: landing.surface,
          borderTop: `1px solid ${landing.border}`,
          borderBottom: `1px solid ${landing.border}`,
        }}
      >
        <div className="landing-section" style={{ maxWidth: 760, textAlign: 'center' }}>
          <h2 className="landing-h2" style={{ marginBottom: 12 }}>
            Coaches already have the video.
          </h2>
          <p
            style={{
              fontFamily: landing.fontSerif,
              fontSize: 22,
              color: landing.sub,
              margin: '0 0 28px',
              letterSpacing: '-0.02em',
            }}
          >
            They don&apos;t have the time to watch all of it.
          </p>
          <p className="landing-body" style={{ marginBottom: 20 }}>
            Every practice contains thousands of moments that are difficult to
            track manually.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 28,
            }}
          >
            {PROBLEMS.map(q => (
              <span
                key={q}
                style={{
                  fontSize: 13,
                  color: landing.sub,
                  background: landing.bg,
                  border: `1px solid ${landing.border}`,
                  borderRadius: 999,
                  padding: '7px 12px',
                }}
              >
                {q}
              </span>
            ))}
          </div>
          <p className="landing-body" style={{ color: landing.ink, fontWeight: 500 }}>
            Playvia turns those moments into structured intelligence — so coaches
            spend less time searching through video and more time coaching.
          </p>
        </div>
      </section>

      {/* VIDEO → INTELLIGENCE */}
      <section id="athletes" className="landing-section">
        <div style={{ maxWidth: 640, marginBottom: 40 }}>
          <p className="landing-eyebrow" style={{ marginBottom: 12 }}>
            Video → Intelligence
          </p>
          <h2 className="landing-h2">From video to understanding.</h2>
        </div>
        <div
          className="landing-steps"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
          }}
        >
          {STEPS.map(step => (
            <div
              key={step.n}
              style={{
                padding: 20,
                borderRadius: 14,
                border: `1px solid ${landing.border}`,
                background: landing.surface,
                minHeight: 220,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: landing.teal,
                  marginBottom: 14,
                  letterSpacing: '0.04em',
                }}
              >
                {step.n}
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  margin: '0 0 8px',
                  color: landing.ink,
                  letterSpacing: '-0.02em',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: landing.ink,
                  margin: '0 0 8px',
                  lineHeight: 1.45,
                }}
              >
                {step.body}
              </p>
              <p style={{ fontSize: 13, color: landing.sub, margin: 0, lineHeight: 1.55 }}>
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* EVIDENCE */}
      <section
        style={{
          background: landing.surface,
          borderTop: `1px solid ${landing.border}`,
          borderBottom: `1px solid ${landing.border}`,
        }}
      >
        <div className="landing-section">
          <div style={{ maxWidth: 640, marginBottom: 36 }}>
            <p className="landing-eyebrow" style={{ marginBottom: 12 }}>
              Trust
            </p>
            <h2 className="landing-h2" style={{ marginBottom: 14 }}>
              Every insight comes with evidence.
            </h2>
            <p className="landing-lead">
              AI shouldn&apos;t ask coaches to trust a black box.
            </p>
          </div>
          <EvidenceMock />
        </div>
      </section>

      {/* HONEST AI */}
      <section className="landing-section">
        <div style={{ maxWidth: 640, marginBottom: 36 }}>
          <h2 className="landing-h2">
            Know what happened. Know what Playvia doesn&apos;t know.
          </h2>
        </div>
        <HonestAiPanel />
      </section>

      {/* OBSERVATION */}
      <section
        style={{
          background: landing.surface,
          borderTop: `1px solid ${landing.border}`,
          borderBottom: `1px solid ${landing.border}`,
        }}
      >
        <div className="landing-section">
          <div style={{ maxWidth: 640, marginBottom: 32 }}>
            <h2 className="landing-h2">
              Surface the signal. Let the coach decide what it means.
            </h2>
          </div>
          <ObservationPanel />
        </div>
      </section>

      {/* PLATFORM */}
      <section id="platform" className="landing-section">
        <div style={{ maxWidth: 640, marginBottom: 40 }}>
          <p className="landing-eyebrow" style={{ marginBottom: 12 }}>
            Platform
          </p>
          <h2 className="landing-h2">Intelligence across every layer of the game.</h2>
        </div>
        <div
          className="landing-platform"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {PLATFORM.map(item => (
            <div
              key={item.title}
              style={{
                padding: 22,
                borderRadius: 14,
                border: `1px solid ${landing.border}`,
                background: landing.surface,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 220,
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: '0 0 10px',
                  letterSpacing: '-0.02em',
                  color: landing.ink,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: landing.sub,
                  margin: 0,
                  flex: 1,
                }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* COACHES */}
      <section
        id="coaches"
        style={{
          background: '#0B1411',
          color: '#fff',
        }}
      >
        <div className="landing-section">
          <div style={{ maxWidth: 640, marginBottom: 36 }}>
            <p
              className="landing-eyebrow"
              style={{ marginBottom: 12, color: landing.tealBright }}
            >
              For coaches
            </p>
            <h2 className="landing-h2" style={{ color: '#fff', marginBottom: 14 }}>
              One coach. Every player. Every practice.
            </h2>
            <p className="landing-lead" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Playvia turns isolated videos into an evolving picture of player
              development.
            </p>
          </div>
          <div
            style={{
              // Lighten cards for contrast on dark bg via filter inversion of tokens
              // Cards use white — wrap with a light surface strip
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16,
              padding: 16,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <CoachRosterMock />
          </div>
        </div>
      </section>

      {/* MULTI-SPORT */}
      <section className="landing-section" style={{ textAlign: 'center' }}>
        <h2 className="landing-h2" style={{ marginBottom: 14 }}>
          One intelligence platform. Any sport.
        </h2>
        <p className="landing-lead" style={{ maxWidth: 520, margin: '0 auto 32px' }}>
          The intelligence layer adapts to the sport. The coaching context stays
          specific to the athlete.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {SPORTS.map(sport => (
            <div
              key={sport}
              style={{
                minWidth: 120,
                padding: '16px 20px',
                borderRadius: 12,
                border: `1px solid ${landing.border}`,
                background: landing.surface,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: landing.ink,
                }}
              >
                {sport}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        id="early-access"
        style={{
          borderTop: `1px solid ${landing.border}`,
          background: landing.surface,
        }}
      >
        <div
          className="landing-section"
          style={{ maxWidth: 640, textAlign: 'center', paddingTop: 96, paddingBottom: 96 }}
        >
          <h2 className="landing-h2" style={{ marginBottom: 14 }}>
            The future of coaching starts with seeing more.
          </h2>
          <p className="landing-lead" style={{ marginBottom: 28 }}>
            Playvia turns sports video into intelligence — giving coaches a
            clearer picture of every player, every practice, and every match.
          </p>
          <div
            style={{
              maxWidth: 420,
              margin: '0 auto 16px',
              textAlign: 'left',
            }}
          >
            <WaitlistForm
              source="homepage"
              successMessage="You're on the list. We'll be in touch as Practice Intelligence opens."
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <SecondaryCta href="#product" />
          </div>
        </div>
      </section>

      <footer
        style={{
          borderTop: `1px solid ${landing.border}`,
          padding: '22px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          background: landing.bg,
        }}
      >
        <div
          style={{
            fontFamily: landing.fontSerif,
            fontSize: 18,
            letterSpacing: '-0.02em',
            color: landing.ink,
          }}
        >
          Play<span style={{ color: landing.tealBright, fontStyle: 'italic' }}>via</span>
        </div>
        <p style={{ fontSize: 12, color: landing.muted, margin: 0 }}>
          Sports Intelligence Platform · playvia.studio
        </p>
        <div style={{ display: 'flex', gap: 18 }}>
          {['Privacy', 'Terms', 'Contact'].map(item => (
            <span key={item} style={{ fontSize: 12, color: landing.muted }}>
              {item}
            </span>
          ))}
        </div>
      </footer>
    </div>
  )
}
