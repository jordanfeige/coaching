'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import RecruitingWizard from '@/components/RecruitingWizard'
import UniversalVia from '@/components/UniversalVia'
import ViaBlob from '@/components/ViaBlob'
import ViaRecruitingOutlookCard from '@/components/ViaRecruitingOutlookCard'
import { parseRecruitingOutlook } from '@/lib/recruiting-outlook'

const TEAL = '#1D9E75'
const TEAL_DARK = '#085041'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

function projectionSummary(projection: unknown): string {
  if (!projection) return ''
  if (typeof projection === 'string') return projection
  const outlook = parseRecruitingOutlook(projection)
  if (outlook?.snapshot) return outlook.snapshot
  const p = projection as Record<string, unknown>
  return String(
    p.overall_assessment || p.via_family_summary || p.summary || '',
  )
}

function roadmapItems(profile: Record<string, unknown> | null) {
  const wnh = profile?.via_what_needs_to_happen
  if (Array.isArray(wnh) && wnh.length > 0) {
    return wnh.map((item: unknown) => {
      const i = item as Record<string, string>
      return i.action || i.title || String(item)
    })
  }
  const timeline = profile?.via_timeline
  if (Array.isArray(timeline)) {
    return timeline.map((item: unknown) => {
      const i = item as Record<string, string>
      return i.action || i.description || i.timeframe || String(item)
    })
  }
  return []
}

export default function PlayerRecruitingPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState<{
    id: string
    name: string
    sport?: string
  } | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [view, setView] = useState<'wizard' | 'roadmap'>('wizard')

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const playerRow = await getLinkedPlayerRowForUser(supabase, user.id)

    if (!playerRow?.id) {
      setLoading(false)
      return
    }

    setPlayer({
      id: playerRow.id,
      name: playerRow.name || 'Athlete',
      sport: playerRow.sport || 'tennis',
    })

    const { data: recruiting } = await supabase
      .from('recruiting_profiles')
      .select('*')
      .eq('player_id', playerRow.id)
      .maybeSingle()

    setProfile(recruiting as Record<string, unknown> | null)
    setView(recruiting?.wizard_completed ? 'roadmap' : 'wizard')
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 24px', fontFamily: 'Arial, sans-serif' }}>
        <div
          style={{
            height: 200,
            borderRadius: 14,
            background: WARM_BG,
          }}
        />
      </div>
    )
  }

  if (!player) {
    return (
      <div
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: TEXT_MUTED,
          fontFamily: 'Arial, sans-serif',
          maxWidth: 400,
          margin: '0 auto',
        }}
      >
        <p style={{ fontSize: 14, color: TEXT, marginBottom: 8 }}>
          We couldn&apos;t find your athlete profile.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          Ask your coach to link your account, or finish setup from the invite
          email they sent you.
        </p>
      </div>
    )
  }

  if (view === 'wizard') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 0 40px' }}>
        <div
          style={{
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <RecruitingWizard
            playerId={player.id}
            playerName={player.name}
            sport={player.sport || 'tennis'}
            onComplete={() => {
              void loadData()
            }}
          />
        </div>
      </div>
    )
  }

  const outlook = parseRecruitingOutlook(profile?.via_projection)
  const summary = projectionSummary(profile?.via_projection)
  const steps = roadmapItems(profile)

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '0 0 40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <UniversalVia
        role="player"
        playerId={player.id}
        playerName={player.name}
        pageContext={{
          page: 'player-recruiting',
          utrSingles:
            profile?.utr_singles != null
              ? Number(profile.utr_singles)
              : undefined,
          targetDivision:
            typeof profile?.target_division === 'string'
              ? profile.target_division
              : undefined,
        }}
      />

      <div
        style={{
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          padding: '18px 20px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#E1F5EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 500,
              color: TEAL_DARK,
              flexShrink: 0,
            }}
          >
            {player.name
              ?.split(' ')
              .map(w => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: TEXT,
                marginBottom: 2,
              }}
            >
              {player.name}
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>
              {player.sport || 'tennis'} ·{' '}
              {profile?.target_division
                ? `${profile.target_division} target`
                : 'Recruiting profile'}
              {profile?.grad_year
                ? ` · Class of ${profile.grad_year}`
                : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView('wizard')}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: `0.5px solid ${BORDER}`,
              background: 'white',
              fontSize: 11,
              color: TEXT_MUTED,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}
        >
          <div
            style={{
              padding: '10px',
              background: profile?.utr_singles ? '#E1F5EE' : WARM_BG,
              borderRadius: 10,
              border: profile?.utr_singles
                ? '0.5px solid #9FE1CB'
                : 'none',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: profile?.utr_singles ? TEAL_DARK : TEXT_MUTED,
                lineHeight: 1,
              }}
            >
              {profile?.utr_singles != null
                ? Number(profile.utr_singles).toFixed(2)
                : '—'}
            </div>
            <div
              style={{
                fontSize: 10,
                color: profile?.utr_singles ? '#0F6E56' : TEXT_MUTED,
                marginTop: 3,
              }}
            >
              UTR Singles
            </div>
          </div>
          <div
            style={{
              padding: '10px',
              background: WARM_BG,
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: profile?.gpa ? TEXT : TEXT_MUTED,
                lineHeight: 1,
              }}
            >
              {profile?.gpa != null ? String(profile.gpa) : '—'}
            </div>
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 3 }}>
              GPA
            </div>
          </div>
        </div>
      </div>

      {outlook ? (
        <div style={{ marginBottom: 12 }}>
          <ViaRecruitingOutlookCard
            outlook={outlook}
            title="Via — your outlook"
            compact
          />
        </div>
      ) : summary ? (
        <div
          style={{
            background: '#E1F5EE',
            border: '0.5px solid #9FE1CB',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <ViaBlob size={20} />
            <span style={{ fontSize: 12, fontWeight: 500, color: TEAL_DARK }}>
              Via — your outlook
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: '#04342C',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {summary}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: WARM_BG,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '16px',
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          <ViaBlob size={28} />
          <div
            style={{
              fontSize: 13,
              color: TEXT,
              fontWeight: 500,
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            Your roadmap is being prepared
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>
            Your coach will generate your Via projection from your profile.
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div
          style={{
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: 10,
            }}
          >
            Your roadmap
          </div>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                padding: '8px 0',
                borderTop: i > 0 ? `0.5px solid ${BORDER}` : 'none',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#E1F5EE',
                  color: TEAL_DARK,
                  fontSize: 10,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 13, color: TEXT, lineHeight: 1.55 }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      )}

      <ProfileStatusCard
        profile={profile}
        onUpdate={() => setView('wizard')}
      />

      <button
        type="button"
        onClick={() => {
          window.location.href = '/player/progress'
        }}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 12,
          background: '#E1F5EE',
          border: '0.5px solid #9FE1CB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <ViaBlob size={20} />
        <span style={{ fontSize: 13, fontWeight: 500, color: TEAL_DARK }}>
          View progress & analysis
        </span>
      </button>
    </div>
  )
}

function ProfileStatusCard({
  profile,
  onUpdate,
}: {
  profile: Record<string, unknown> | null
  onUpdate: () => void
}) {
  function row(
    label: string,
    value: string | null | undefined,
    isLast: boolean,
  ) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 16px',
          borderBottom: isLast ? 'none' : `0.5px solid ${BORDER}`,
        }}
      >
        <span style={{ fontSize: 13, color: TEXT }}>{label}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: value ? 500 : 400,
            color: value ? TEAL_DARK : TEXT_MUTED,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {value ? (
            <>
              {value}
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke={TEAL}
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </>
          ) : (
            <>
              Add
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke={TEXT_MUTED}
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </>
          )}
        </span>
      </div>
    )
  }

  const satAct = profile?.sat_score
    ? `${profile.sat_score} SAT`
    : profile?.act_score
      ? `${profile.act_score} ACT`
      : null

  const goals = [
    { label: 'Target division', value: profile?.target_division as string },
    { label: 'Pro interest', value: profile?.pro_interest as string },
    {
      label: 'Geographic preference',
      value: profile?.geographic_preference as string,
    },
    { label: 'Scholarship need', value: profile?.scholarship_need as string },
    { label: 'Campus size', value: profile?.campus_size as string },
  ]

  const academic = [
    {
      label: 'GPA',
      value: profile?.gpa != null ? String(profile.gpa) : null,
    },
    { label: 'SAT / ACT', value: satAct },
    { label: 'Intended major', value: profile?.intended_major as string },
  ]

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          borderBottom: `0.5px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>
          My profile
        </span>
        <button
          type="button"
          onClick={onUpdate}
          style={{
            fontSize: 11,
            color: TEAL,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Update
        </button>
      </div>

      <SectionHeader label="Goals" />
      {goals.map((item, i) =>
        row(item.label, item.value, i === goals.length - 1),
      )}

      <SectionHeader label="Academic" topBorder />
      {academic.map((item, i) =>
        row(item.label, item.value, i === academic.length - 1),
      )}
    </div>
  )
}

function SectionHeader({
  label,
  topBorder,
}: {
  label: string
  topBorder?: boolean
}) {
  return (
    <div
      style={{
        padding: '5px 16px 3px',
        background: WARM_BG,
        borderTop: topBorder ? `0.5px solid ${BORDER}` : 'none',
        borderBottom: `0.5px solid ${BORDER}`,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: TEXT_MUTED,
          textTransform: 'uppercase',
          letterSpacing: '.07em',
        }}
      >
        {label}
      </span>
    </div>
  )
}
