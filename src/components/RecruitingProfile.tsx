'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import ViaBlob from '@/components/ViaBlob'
import { format } from 'date-fns'
import { parseUstaUaid } from '@/lib/usta'

const TEAL = '#1D9E75'
const TEAL_DARK = '#085041'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const RED = '#DC2626'
const AMBER = '#D97706'
const PURPLE = '#7C3AED'
const BLUE = '#185FA5'

interface Props {
  profileId?: string
  playerId: string
  playerName: string
  sport: string
  isCoach?: boolean
  analysisSessions?: any[]
}

export default function RecruitingProfile({
  profileId: initialProfileId,
  playerId,
  playerName,
  sport,
  isCoach = false,
  analysisSessions = [],
}: Props) {
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [profileId, setProfileId] =
    useState(initialProfileId)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [syncError, setSyncError] = useState('')

  // Form state (coach only)
  const [uaId, setUaId] = useState('')
  const [utrSingles, setUtrSingles] = useState('')
  const [targetDivision, setTargetDivision] =
    useState('D1')
  const [gpa, setGpa] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [geoPreference, setGeoPreference] = useState('')
  const [coachAssessment, setCoachAssessment] =
    useState('')
  const [gender, setGender] = useState('male')

  const firstName = playerName.split(' ')[0]

  // Calculate technique stats from sessions
  const techniqueStats = (() => {
    if (!analysisSessions.length) return null
    const sorted = [...analysisSessions].sort(
      (a, b) =>
        new Date(a.analyzed_at).getTime() -
        new Date(b.analyzed_at).getTime()
    )
    const latest = sorted[sorted.length - 1]
    const first = sorted[0]
    const last3 = sorted.slice(-3)

    const velocity = last3.length >= 2
      ? (
          (last3[last3.length - 1].overall_score -
            last3[0].overall_score) /
          last3.length
        ).toFixed(1)
      : null

    const allIssues = new Set<string>()
    const fixedIssues: string[] = []
    sorted.forEach(s => {
      const areas =
        s.full_result?.areas_to_improve || []
      areas.forEach((a: any) => {
        if (a.area) allIssues.add(a.area)
      })
    })

    const recentIssues = new Set<string>()
    sorted.slice(-2).forEach(s => {
      const areas =
        s.full_result?.areas_to_improve || []
      areas.forEach((a: any) => {
        if (a.area) recentIssues.add(a.area)
      })
    })

    allIssues.forEach(issue => {
      if (!recentIssues.has(issue)) {
        fixedIssues.push(issue)
      }
    })

    return {
      currentScore: latest?.overall_score,
      velocity,
      topIssues: Array.from(recentIssues).slice(0, 3),
      fixedIssues: fixedIssues.slice(0, 5),
      sessionCount: sorted.length,
    }
  })()

  useEffect(() => {
    loadProfile()
  }, [playerId])

  async function loadProfile() {
    const { data } = await supabase
      .from('recruiting_profiles')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle()

    if (data) {
      setProfile(data)
      setProfileId(data.id)
      setUaId(data.usta_uaid || '')
      setUtrSingles(data.utr_singles?.toString() || '')
      setTargetDivision(data.target_division || 'D1')
      setGpa(data.gpa?.toString() || '')
      setGradYear(data.grad_year?.toString() || '')
      setGeoPreference(data.geographic_preference || '')
      setCoachAssessment(data.coach_assessment || '')
      setGender(data.gender || 'male')
    }
    setLoading(false)
  }

  async function saveProfile(): Promise<string | undefined> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const profileData = {
      player_id: playerId,
      coach_id: user?.id,
      usta_uaid: uaId ? parseUstaUaid(uaId) : null,
      utr_singles: utrSingles
        ? parseFloat(utrSingles)
        : null,
      target_division: targetDivision,
      gpa: gpa ? parseFloat(gpa) : null,
      grad_year: gradYear ? parseInt(gradYear, 10) : null,
      geographic_preference: geoPreference || null,
      coach_assessment: coachAssessment || null,
      gender,
      updated_at: new Date().toISOString(),
    }

    if (profileId) {
      const { data } = await supabase
        .from('recruiting_profiles')
        .update(profileData)
        .eq('id', profileId)
        .select()
        .maybeSingle()
      if (data) {
        setProfile(data)
        setProfileId(data.id)
        return data.id
      }
      return profileId
    }

    const { data } = await supabase
      .from('recruiting_profiles')
      .insert(profileData)
      .select()
      .maybeSingle()
    if (data) {
      setProfile(data)
      setProfileId(data.id)
      return data.id
    }
    return undefined
  }

  async function syncUSTAData() {
    if (!uaId) return
    setSyncing(true)
    setSyncError('')

    const id = await saveProfile()
    try {
      const res = await fetch('/api/usta-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uaid: uaId.trim(),
          profileId: id,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setSyncResult(data.data)
        await loadProfile()
      } else if (data.fallback) {
        setSyncError(data.message)
      }
    } catch (e) {
      setSyncError(
        'Sync failed. You can still enter ' +
        'rankings manually below.'
      )
    }
    setSyncing(false)
  }

  async function generateProjection() {
    setGenerating(true)

    const id = await saveProfile()

    try {
      const res = await fetch(
        '/api/recruiting-projection',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profileId: id,
            playerId,
            playerName,
            sport,
            gender,
            gradYear: gradYear
              ? parseInt(gradYear, 10)
              : null,
            age: profile?.age,
            gpa: gpa ? parseFloat(gpa) : null,
            wtnSingles: profile?.wtn_singles,
            utrSingles: utrSingles
              ? parseFloat(utrSingles)
              : null,
            nationalRank: profile?.usta_national_rank,
            sectionRank: profile?.usta_section_rank,
            winRecord: profile?.usta_win_record,
            lossRecord: profile?.usta_loss_record,
            ageCategory: profile?.usta_age_category,
            targetDivision,
            geographicPreference: geoPreference,
            coachAssessment,
            techniqueScore:
              techniqueStats?.currentScore,
            techniqueVelocity:
              techniqueStats?.velocity,
            topIssues: techniqueStats?.topIssues,
            fixedIssues: techniqueStats?.fixedIssues,
            sessionCount:
              techniqueStats?.sessionCount,
          }),
        }
      )
      const data = await res.json()
      if (data.success) {
        await loadProfile()
      }
    } catch (e) {
      console.error('Projection error:', e)
    }
    setGenerating(false)
  }

  async function publishToFamily() {
    if (!profileId) return
    setPublishing(true)
    await supabase
      .from('recruiting_profiles')
      .update({
        published_to_family: true,
        published_at: new Date().toISOString(),
      })
      .eq('id', profileId)
    await loadProfile()
    setPublishing(false)
  }

  const projection = profile?.via_projection
  const schoolTargets = profile?.via_school_targets
  const timeline = profile?.via_timeline

  if (loading) {
    return null
  }

  // ── FAMILY VIEW (read-only) ──────────────────────
  if (!isCoach) {
    if (!profile?.published_to_family) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          color: TEXT_MUTED,
        }}>
          <ViaBlob size={40} style={{ margin: '0 auto 14px' }} />
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: TEXT,
            marginBottom: 6,
          }}>
            Recruiting profile coming soon
          </div>
          <p style={{
            fontSize: 13,
            color: TEXT_SEC,
            lineHeight: 1.6,
          }}>
            Your coach is building{' '}
            {firstName}'s recruiting profile.
            It will appear here once published.
          </p>
        </div>
      )
    }

    return (
      <div style={{
        fontFamily: 'Arial, sans-serif',
        color: TEXT,
        maxWidth: 560,
        margin: '0 auto',
        padding: '0 0 40px',
      }}>

        {/* Hero */}
        <div style={{
          background:
            'linear-gradient(160deg, #04342C, ' +
            '#085041 55%, #0d1a30)',
          padding: '24px 20px 20px',
          borderRadius: 16,
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            fontSize: 140,
            fontWeight: 900,
            color: 'rgba(255,255,255,.03)',
            lineHeight: 1,
            top: -10,
            right: -10,
            pointerEvents: 'none',
          }}>
            {profile.wtn_singles?.toFixed(1) || '—'}
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              fontSize: 10,
              color: 'rgba(255,255,255,.4)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              marginBottom: 4,
            }}>
              Recruiting Profile · Class of{' '}
              {profile.grad_year}
            </div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'white',
              marginBottom: 2,
            }}>
              {playerName}
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,.5)',
              marginBottom: 16,
            }}>
              Tennis ·{' '}
              {profile.usta_section || 'USA'} ·
              Target {profile.target_division}
            </div>
            <div style={{
              display: 'flex',
              gap: 16,
            }}>
              {profile.wtn_singles && (
                <div>
                  <div style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,.4)',
                    marginBottom: 1,
                  }}>
                    WTN Singles
                  </div>
                  <div style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 1,
                  }}>
                    {profile.wtn_singles.toFixed(2)}
                  </div>
                </div>
              )}
              {profile.usta_national_rank && (
                <>
                  <div style={{
                    width: .5,
                    background: 'rgba(255,255,255,.1)',
                  }} />
                  <div>
                    <div style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,.4)',
                      marginBottom: 1,
                    }}>
                      National Rank
                    </div>
                    <div style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: 'white',
                      lineHeight: 1,
                    }}>
                      #{profile.usta_national_rank}
                    </div>
                  </div>
                </>
              )}
              {techniqueStats?.currentScore && (
                <>
                  <div style={{
                    width: .5,
                    background: 'rgba(255,255,255,.1)',
                  }} />
                  <div>
                    <div style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,.4)',
                      marginBottom: 1,
                    }}>
                      Technique
                    </div>
                    <div style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#5DCAA5',
                      lineHeight: 1,
                    }}>
                      {techniqueStats.currentScore}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Via summary */}
        {projection?.via_family_summary && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '13px 15px',
            background:
              'linear-gradient(135deg, #eaf7f2, ' +
              '#eff3fe 60%, #f5f0fd)',
            borderRadius: 14,
            border:
              '0.5px solid rgba(29,158,117,.15)',
            marginBottom: 14,
          }}>
            <ViaBlob size={22} style={{ marginTop: 1 }} />
            <p style={{
              fontSize: 13,
              color: TEXT,
              lineHeight: 1.65,
              margin: 0,
            }}>
              {projection.via_family_summary}
            </p>
          </div>
        )}

        {/* WTN Projection */}
        {projection?.projected_wtn_at_graduation && (
          <div style={{
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: 10,
            }}>
              WTN projection
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 10,
                  color: TEXT_MUTED,
                  marginBottom: 3,
                }}>
                  Today
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: TEXT,
                  lineHeight: 1,
                }}>
                  {profile.wtn_singles?.toFixed(1)
                    || '—'}
                </div>
              </div>
              <div style={{
                fontSize: 18,
                color: TEXT_MUTED,
                alignSelf: 'center',
              }}>
                →
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 10,
                  color: TEXT_MUTED,
                  marginBottom: 3,
                }}>
                  Junior yr
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: TEAL,
                  lineHeight: 1,
                }}>
                  {projection
                    .projected_wtn_junior_year
                    ?.low}
                  –
                  {projection
                    .projected_wtn_junior_year
                    ?.high}
                </div>
              </div>
              <div style={{
                fontSize: 18,
                color: TEXT_MUTED,
                alignSelf: 'center',
              }}>
                →
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 10,
                  color: TEXT_MUTED,
                  marginBottom: 3,
                }}>
                  Signing
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: TEAL,
                  lineHeight: 1,
                }}>
                  {projection
                    .projected_wtn_at_graduation
                    ?.low}
                  –
                  {projection
                    .projected_wtn_at_graduation
                    ?.high}
                </div>
              </div>
            </div>
            <div style={{
              fontSize: 11,
              color: TEXT_MUTED,
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              {projection
                .projected_wtn_at_graduation?.basis}
            </div>
          </div>
        )}

        {/* School targets */}
        {schoolTargets && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: 9,
            }}>
              School targets
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
            }}>
              {schoolTargets.reach?.length > 0 && (
                <div style={{
                  background: 'white',
                  border: '0.5px solid #C4B5FD',
                  borderRadius: 12,
                  padding: '11px 13px',
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: PURPLE,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    marginBottom: 7,
                  }}>
                    Reach
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}>
                    {schoolTargets.reach.map(
                      (s: any) => (
                        <span key={s.school} style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: '#EDE9FE',
                          border: '0.5px solid #C4B5FD',
                          fontSize: 11,
                          color: PURPLE,
                        }}>
                          {s.school}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
              {schoolTargets.target?.length > 0 && (
                <div style={{
                  background: 'white',
                  border: '0.5px solid #86EFAC',
                  borderRadius: 12,
                  padding: '11px 13px',
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: TEAL,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    marginBottom: 7,
                  }}>
                    Target
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}>
                    {schoolTargets.target.map(
                      (s: any) => (
                        <span key={s.school} style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: '#E1F5EE',
                          border: '0.5px solid #86EFAC',
                          fontSize: 11,
                          color: '#0F6E56',
                        }}>
                          {s.school}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
              {schoolTargets.likely?.length > 0 && (
                <div style={{
                  background: 'white',
                  border: '0.5px solid #93C5FD',
                  borderRadius: 12,
                  padding: '11px 13px',
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: BLUE,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    marginBottom: 7,
                  }}>
                    Likely
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}>
                    {schoolTargets.likely.map(
                      (s: any) => (
                        <span key={s.school} style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: '#E6F1FB',
                          border: '0.5px solid #93C5FD',
                          fontSize: 11,
                          color: BLUE,
                        }}>
                          {s.school}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        {timeline?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: 9,
            }}>
              Recruiting timeline
            </div>
            <div style={{
              background: 'white',
              border: `0.5px solid ${BORDER}`,
              borderRadius: 14,
              padding: '14px 16px',
            }}>
              {timeline.map(
                (phase: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      paddingBottom:
                        i < timeline.length - 1
                          ? 14 : 0,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: 16,
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: 10, height: 10,
                        borderRadius: '50%',
                        background:
                          i === 0 ? TEAL
                          : i === 1 ? AMBER
                          : PURPLE,
                        marginTop: 3,
                        flexShrink: 0,
                      }} />
                      {i < timeline.length - 1 && (
                        <div style={{
                          width: 1.5,
                          flex: 1,
                          background: BORDER,
                          marginTop: 3,
                        }} />
                      )}
                    </div>
                    <div style={{
                      flex: 1,
                      paddingBottom:
                        i < timeline.length - 1
                          ? 4 : 0,
                    }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: TEXT,
                        marginBottom: 2,
                      }}>
                        {phase.timeframe}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: TEXT_SEC,
                        lineHeight: 1.55,
                      }}>
                        {phase.description}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        {projection?.disclaimer && (
          <div style={{
            fontSize: 11,
            color: TEXT_MUTED,
            lineHeight: 1.55,
            padding: '10px 12px',
            background: WARM_BG,
            borderRadius: 10,
            fontStyle: 'italic',
          }}>
            {projection.disclaimer}
          </div>
        )}

        {/* Last updated */}
        {profile.published_at && (
          <div style={{
            textAlign: 'center',
            fontSize: 11,
            color: TEXT_MUTED,
            marginTop: 12,
          }}>
            Published by coach ·{' '}
            {format(
              new Date(profile.published_at),
              'MMM d, yyyy'
            )}
          </div>
        )}
      </div>
    )
  }

  // ── COACH VIEW ───────────────────────────────────
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      color: TEXT,
      maxWidth: 600,
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            color: TEXT,
            letterSpacing: '-.4px',
            marginBottom: 2,
          }}>
            Recruiting Profile
          </h2>
          <p style={{
            fontSize: 12,
            color: TEXT_MUTED,
          }}>
            {playerName} · Tennis
          </p>
        </div>
        {profile?.published_to_family && (
          <div style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: '#E1F5EE',
            border:
              '0.5px solid rgba(29,158,117,.2)',
            fontSize: 11,
            color: '#0F6E56',
            fontWeight: 600,
          }}>
            ✓ Published to family
          </div>
        )}
      </div>

      {/* USTA Sync section */}
      <div style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: TEXT_MUTED,
          textTransform: 'uppercase',
          letterSpacing: '.07em',
          marginBottom: 10,
        }}>
          USTA Data Sync
        </div>

        <div style={{
          fontSize: 12,
          color: TEXT_SEC,
          marginBottom: 10,
          lineHeight: 1.55,
        }}>
          Connect {firstName}'s USTA profile to
          automatically sync WTN ratings and
          national rankings.
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: syncResult || syncError
            ? 10 : 0,
        }}>
          <input
            value={uaId}
            onChange={e => setUaId(e.target.value)}
            placeholder="Paste USTA profile URL or player ID"
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 9,
              border: `0.5px solid ${BORDER}`,
              background: WARM_BG,
              fontSize: 12,
              color: TEXT,
              fontFamily: 'Arial, sans-serif',
              outline: 'none',
            }}
          />
          <button
            onClick={syncUSTAData}
            disabled={!uaId.trim() || syncing}
            style={{
              padding: '9px 16px',
              borderRadius: 9,
              background: uaId.trim() && !syncing
                ? TEAL : '#ccc',
              border: 'none',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: uaId.trim() && !syncing
                ? 'pointer' : 'default',
              fontFamily: 'Arial, sans-serif',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {syncing ? 'Syncing...' : 'Sync →'}
          </button>
        </div>
        <div
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            marginTop: 4,
            marginBottom: syncResult || syncError ? 10 : 0,
          }}
        >
          e.g. usta.com/...profile.html#uaid=2018494192 or just the number:
          2018494192
        </div>

        {syncResult && (
          <div style={{
            background: '#E1F5EE',
            border:
              '0.5px solid rgba(29,158,117,.2)',
            borderRadius: 9,
            padding: '9px 12px',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {syncResult.wtnSingles && (
              <div>
                <div style={{
                  fontSize: 9,
                  color: '#0F6E56',
                  marginBottom: 1,
                }}>
                  WTN Singles
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#0F6E56',
                }}>
                  {syncResult.wtnSingles.toFixed(2)}
                </div>
              </div>
            )}
            {syncResult.nationalRank && (
              <div>
                <div style={{
                  fontSize: 9,
                  color: '#0F6E56',
                  marginBottom: 1,
                }}>
                  National Rank
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#0F6E56',
                }}>
                  #{syncResult.nationalRank}
                </div>
              </div>
            )}
            {syncResult.winRecord !== undefined && (
              <div>
                <div style={{
                  fontSize: 9,
                  color: '#0F6E56',
                  marginBottom: 1,
                }}>
                  Win/Loss
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#0F6E56',
                }}>
                  {syncResult.winRecord}/
                  {syncResult.lossRecord}
                </div>
              </div>
            )}
          </div>
        )}

        {syncError && (
          <div style={{
            background: '#FFFBEB',
            border: '0.5px solid #FCD34D',
            borderRadius: 9,
            padding: '9px 12px',
            fontSize: 12,
            color: AMBER,
          }}>
            {syncError}
          </div>
        )}

        {profile?.last_synced_at && (
          <div style={{
            fontSize: 10,
            color: TEXT_MUTED,
            marginTop: 6,
          }}>
            Last synced:{' '}
            {format(
              new Date(profile.last_synced_at),
              'MMM d, h:mm a'
            )}
          </div>
        )}
      </div>

      {/* Coach inputs */}
      <div style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: TEXT_MUTED,
          textTransform: 'uppercase',
          letterSpacing: '.07em',
        }}>
          Player details
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}>
          <div>
            <div style={{
              fontSize: 11,
              color: TEXT_MUTED,
              marginBottom: 4,
            }}>
              Grad year
            </div>
            <input
              value={gradYear}
              onChange={e =>
                setGradYear(e.target.value)
              }
              placeholder="e.g. 2027"
              style={{
                width: '100%',
                padding: '8px 11px',
                borderRadius: 8,
                border: `0.5px solid ${BORDER}`,
                background: WARM_BG,
                fontSize: 13,
                color: TEXT,
                fontFamily: 'Arial, sans-serif',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{
              fontSize: 11,
              color: TEXT_MUTED,
              marginBottom: 4,
            }}>
              GPA (optional)
            </div>
            <input
              value={gpa}
              onChange={e => setGpa(e.target.value)}
              placeholder="e.g. 3.8"
              style={{
                width: '100%',
                padding: '8px 11px',
                borderRadius: 8,
                border: `0.5px solid ${BORDER}`,
                background: WARM_BG,
                fontSize: 13,
                color: TEXT,
                fontFamily: 'Arial, sans-serif',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <div style={{
            fontSize: 11,
            color: TEXT_MUTED,
            marginBottom: 6,
          }}>
            Gender
          </div>
          <div style={{
            display: 'flex',
            gap: 6,
          }}>
            {['male', 'female'].map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  background: gender === g
                    ? TEAL : 'white',
                  border: `0.5px solid ${gender === g
                    ? TEAL : BORDER}`,
                  color: gender === g
                    ? 'white' : TEXT_SEC,
                  fontSize: 12,
                  fontWeight: gender === g ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  textTransform: 'capitalize',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* UTR manual */}
        <div>
          <div style={{
            fontSize: 11,
            color: TEXT_MUTED,
            marginBottom: 4,
          }}>
            UTR Singles (manual — update after tournaments)
          </div>
          <input
            value={utrSingles}
            onChange={e =>
              setUtrSingles(e.target.value)
            }
            placeholder="e.g. 8.2"
            style={{
              width: '100%',
              padding: '8px 11px',
              borderRadius: 8,
              border: `0.5px solid ${BORDER}`,
              background: WARM_BG,
              fontSize: 13,
              color: TEXT,
              fontFamily: 'Arial, sans-serif',
              outline: 'none',
            }}
          />
        </div>

        {/* Target division */}
        <div>
          <div style={{
            fontSize: 11,
            color: TEXT_MUTED,
            marginBottom: 6,
          }}>
            Target division
          </div>
          <div style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}>
            {['D1', 'D2', 'D3', 'NAIA', 'JC'].map(
              d => (
                <button
                  key={d}
                  onClick={() =>
                    setTargetDivision(d)
                  }
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    background:
                      targetDivision === d
                        ? TEAL : 'white',
                    border: `0.5px solid ${targetDivision === d
                      ? TEAL : BORDER}`,
                    color: targetDivision === d
                      ? 'white' : TEXT_SEC,
                    fontSize: 12,
                    fontWeight:
                      targetDivision === d ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {d}
                </button>
              )
            )}
          </div>
        </div>

        {/* Geographic preference */}
        <div>
          <div style={{
            fontSize: 11,
            color: TEXT_MUTED,
            marginBottom: 4,
          }}>
            Geographic preference (optional)
          </div>
          <input
            value={geoPreference}
            onChange={e =>
              setGeoPreference(e.target.value)
            }
            placeholder="e.g. Southeast, Mid-Atlantic"
            style={{
              width: '100%',
              padding: '8px 11px',
              borderRadius: 8,
              border: `0.5px solid ${BORDER}`,
              background: WARM_BG,
              fontSize: 13,
              color: TEXT,
              fontFamily: 'Arial, sans-serif',
              outline: 'none',
            }}
          />
        </div>

        {/* Coach assessment */}
        <div>
          <div style={{
            fontSize: 11,
            color: TEXT_MUTED,
            marginBottom: 4,
          }}>
            Your assessment
          </div>
          <textarea
            value={coachAssessment}
            onChange={e =>
              setCoachAssessment(e.target.value)
            }
            placeholder={
              `e.g. ${firstName} has D1 upside but needs ` +
              `1.5 more UTR points. Work ethic is strong. ` +
              `Footwork is the limiting factor right now.`
            }
            style={{
              width: '100%',
              height: 90,
              padding: '9px 11px',
              borderRadius: 9,
              border: `0.5px solid ${BORDER}`,
              background: WARM_BG,
              fontSize: 12,
              color: TEXT,
              fontFamily: 'Arial, sans-serif',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.6,
            }}
          />
        </div>

        <button
          onClick={saveProfile}
          style={{
            padding: '10px',
            borderRadius: 10,
            background: WARM_BG,
            border: `0.5px solid ${BORDER}`,
            color: TEXT_SEC,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Save details
        </button>
      </div>

      {/* Technique data from Playvia */}
      {techniqueStats && (
        <div style={{
          background: '#E1F5EE',
          border:
            '0.5px solid rgba(29,158,117,.2)',
          borderRadius: 14,
          padding: '13px 16px',
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#0F6E56',
            textTransform: 'uppercase',
            letterSpacing: '.07em',
            marginBottom: 8,
          }}>
            Playvia technique data
            (auto-included in projection)
          </div>
          <div style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                fontSize: 9,
                color: '#0F6E56',
                marginBottom: 1,
              }}>
                Technique score
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0F6E56',
              }}>
                {techniqueStats.currentScore}
              </div>
            </div>
            {techniqueStats.velocity && (
              <div>
                <div style={{
                  fontSize: 9,
                  color: '#0F6E56',
                  marginBottom: 1,
                }}>
                  Improvement rate
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0F6E56',
                }}>
                  +{techniqueStats.velocity}
                  pts/session
                </div>
              </div>
            )}
            <div>
              <div style={{
                fontSize: 9,
                color: '#0F6E56',
                marginBottom: 1,
              }}>
                Sessions
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0F6E56',
              }}>
                {techniqueStats.sessionCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generateProjection}
        disabled={generating}
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 12,
          background: generating
            ? '#ccc'
            : 'linear-gradient(135deg, #eaf7f2, ' +
              '#eff3fe 60%, #f5f0fd)',
          border:
            '0.5px solid rgba(29,158,117,.2)',
          color: '#0F6E56',
          fontSize: 14,
          fontWeight: 700,
          cursor: generating
            ? 'default' : 'pointer',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          marginBottom: 14,
          transition: 'opacity 0.15s',
        }}
      >
        <div style={{ flexShrink: 0, pointerEvents: 'none' }}>
          <ViaBlob size={20} />
        </div>
        {generating
          ? 'Via is generating projection...'
          : profile?.via_projection
          ? 'Regenerate projection'
          : 'Generate with Via →'}
      </button>

      {/* Generated projection preview */}
      {projection && (
        <div style={{
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          padding: '16px 18px',
          marginBottom: 14,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: TEXT,
            }}>
              Via's projection
            </div>
            <div style={{
              fontSize: 10,
              padding: '3px 9px',
              borderRadius: 999,
              background: WARM_BG,
              border: `0.5px solid ${BORDER}`,
              color: TEXT_MUTED,
            }}>
              Confidence: {projection.confidence}
            </div>
          </div>

          <p style={{
            fontSize: 13,
            color: TEXT,
            lineHeight: 1.65,
            marginBottom: 14,
          }}>
            {projection.overall_assessment}
          </p>

          {/* What needs to happen */}
          {projection.what_needs_to_happen
            ?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: TEXT_MUTED,
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: 8,
              }}>
                What needs to happen
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                {projection
                  .what_needs_to_happen
                  .map((item: any, i: number) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '9px 12px',
                      background: WARM_BG,
                      border:
                        `0.5px solid ${BORDER}`,
                      borderRadius: 9,
                    }}>
                      <div style={{
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background:
                          item.priority ===
                            'critical' ? RED
                          : item.priority ===
                            'important' ? AMBER
                          : TEAL,
                        flexShrink: 0,
                        marginTop: 4,
                      }} />
                      <div>
                        <div style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: TEXT,
                          marginBottom: 2,
                        }}>
                          {item.action}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: TEXT_SEC,
                          lineHeight: 1.5,
                        }}>
                          {item.why}
                        </div>
                        {item.technique_connection && (
                          <div style={{
                            fontSize: 10,
                            color: TEAL,
                            marginTop: 3,
                          }}>
                            📊 {item
                              .technique_connection}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Publish button */}
      {projection && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <button
            onClick={publishToFamily}
            disabled={publishing}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              background: publishing
                ? '#ccc' : TEAL,
              border: 'none',
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              cursor: publishing
                ? 'default' : 'pointer',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {publishing
              ? 'Publishing...'
              : profile?.published_to_family
              ? 'Update published profile'
              : 'Publish to family →'}
          </button>
          <p style={{
            fontSize: 11,
            color: TEXT_MUTED,
            textAlign: 'center',
            margin: 0,
          }}>
            Family sees a read-only view.
            You can update and republish anytime.
          </p>
        </div>
      )}
    </div>
  )
}

