'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import ViaBlob from '@/components/ViaBlob'
import ViaRecruitingOutlookCard from '@/components/ViaRecruitingOutlookCard'
import ViaSchoolSuggestionsCard from '@/components/ViaSchoolSuggestionsCard'
import { format } from 'date-fns'
import { parseUstaUaid } from '@/lib/usta'
import {
  parseRecruitingOutlook,
  parseSuggestedSchools,
  type ViaSuggestedSchool,
} from '@/lib/recruiting-outlook'

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

const CARD: React.CSSProperties = {
  background: 'white',
  border: `0.5px solid ${BORDER}`,
  borderRadius: 14,
  padding: '14px 16px',
}

const SCHOOL_COLORS = {
  reach: {
    bg: '#EEEDFE',
    border: '#AFA9EC',
    dot: '#534AB7',
    text: '#26215C',
    sub: '#534AB7',
    badge: '#534AB7',
  },
  target: {
    bg: '#E1F5EE',
    border: '#9FE1CB',
    dot: '#0F6E56',
    text: '#04342C',
    sub: '#0F6E56',
    badge: '#0F6E56',
  },
  likely: {
    bg: '#E6F1FB',
    border: '#85B7EB',
    dot: '#185FA5',
    text: '#042C53',
    sub: '#185FA5',
    badge: '#185FA5',
  },
} as const

type SchoolRow = {
  name: string
  division: string
  type: keyof typeof SCHOOL_COLORS
  conference?: string
  location?: string
}

function flattenSchools(targets: unknown): SchoolRow[] {
  if (!targets || typeof targets !== 'object') return []
  const t = targets as Record<string, unknown[]>
  const rows: SchoolRow[] = []
  for (const type of ['reach', 'target', 'likely'] as const) {
    const list = t[type]
    if (!Array.isArray(list)) continue
    for (const raw of list) {
      const s = raw as Record<string, string>
      rows.push({
        name: s.school || s.name || 'School',
        division: s.division || '—',
        type,
        conference: s.conference,
        location: s.location || s.region,
      })
    }
  }
  return rows
}

function projectionText(p: unknown): string {
  if (!p) return ''
  if (typeof p === 'string') return p
  const o = p as Record<string, unknown>
  return String(o.overall_assessment || o.via_family_summary || '')
}

function roadmapItems(
  projection: Record<string, unknown> | null | undefined,
  timeline: unknown,
): Array<{ action: string }> {
  const wnh = projection?.what_needs_to_happen
  if (Array.isArray(wnh) && wnh.length > 0) {
    return wnh.map((item: unknown) => {
      const i = item as Record<string, string>
      return { action: i.action || String(item) }
    })
  }
  if (Array.isArray(timeline)) {
    return timeline.map((item: unknown) => {
      const i = item as Record<string, string>
      return {
        action: i.action || i.description || i.timeframe || String(item),
      }
    })
  }
  return []
}

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
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [profileId, setProfileId] =
    useState(initialProfileId)
  const [projectionError, setProjectionError] = useState('')
  const [suggestingSchools, setSuggestingSchools] = useState(false)
  const [verifyingSchool, setVerifyingSchool] = useState<string | null>(null)

  // Form state (coach only)
  const [uaId, setUaId] = useState('')
  const [wtnSinglesInput, setWtnSinglesInput] = useState('')
  const [nationalRankInput, setNationalRankInput] = useState('')
  const [sectionRankInput, setSectionRankInput] = useState('')
  const [winLossInput, setWinLossInput] = useState('')
  const [utrSinglesInput, setUtrSinglesInput] = useState('')
  const [utrSearch, setUtrSearch] = useState('')
  const [utrResults, setUtrResults] = useState<any[]>([])
  const [utrSearching, setUtrSearching] = useState(false)
  const [utrSyncing, setUtrSyncing] = useState(false)
  const [utrError, setUtrError] = useState('')
  const [targetDivision, setTargetDivision] =
    useState('D1')
  const [gpa, setGpa] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [geoPreference, setGeoPreference] = useState('')
  const [coachAssessment, setCoachAssessment] =
    useState('')
  const [gender, setGender] = useState('male')
  const [sportInput, setSportInput] = useState(sport)
  const [isMobile, setIsMobile] = useState(false)

  const firstName = playerName.split(' ')[0]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
      setUtrSinglesInput(data.utr_singles?.toString() || '')
      setTargetDivision(data.target_division || 'D1')
      setGpa(data.gpa?.toString() || '')
      setGradYear(data.grad_year?.toString() || '')
      setGeoPreference(data.geographic_preference || '')
      setCoachAssessment(data.coach_assessment || '')
      setGender(data.gender || 'male')
      setWtnSinglesInput(data.wtn_singles?.toString() || '')
      setNationalRankInput(data.usta_national_rank?.toString() || '')
      setSectionRankInput(data.usta_section_rank?.toString() || '')
      if (data.usta_win_record != null && data.usta_loss_record != null) {
        setWinLossInput(
          `${data.usta_win_record}/${data.usta_loss_record}`,
        )
      } else {
        setWinLossInput('')
      }
    }
    setLoading(false)
  }

  async function saveProfile(): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return profileId || null

      const winLossParts = winLossInput
        .split('/')
        .map(s => parseInt(s.trim(), 10))
      const winRecord = winLossParts[0] || null
      const lossRecord = winLossParts[1] || null

      const profileData = {
        player_id: playerId,
        coach_id: user.id,
        usta_uaid: uaId ? parseUstaUaid(uaId) : null,
        wtn_singles: wtnSinglesInput ? parseFloat(wtnSinglesInput) : null,
        wtn_last_updated: wtnSinglesInput
          ? new Date().toISOString().split('T')[0]
          : null,
        usta_national_rank: nationalRankInput
          ? parseInt(nationalRankInput, 10)
          : null,
        usta_section_rank: sectionRankInput
          ? parseInt(sectionRankInput, 10)
          : null,
        usta_win_record: winRecord,
        usta_loss_record: lossRecord,
        last_synced_at: new Date().toISOString(),
        utr_singles: utrSinglesInput ? parseFloat(utrSinglesInput) : null,
        target_division: targetDivision,
        gpa: gpa ? parseFloat(gpa) : null,
        grad_year: gradYear ? parseInt(gradYear, 10) : null,
        geographic_preference: geoPreference || null,
        coach_assessment: coachAssessment || null,
        gender,
        updated_at: new Date().toISOString(),
      }

      if (sportInput) {
        await supabase
          .from('players')
          .update({ sport: sportInput })
          .eq('id', playerId)
      }

      if (profileId) {
        await supabase
          .from('recruiting_profiles')
          .update(profileData)
          .eq('id', profileId)
        await loadProfile()
        return profileId
      }

      const { data, error } = await supabase
        .from('recruiting_profiles')
        .insert(profileData)
        .select('id')
        .single()

      if (error) {
        console.error('saveProfile error:', error)
        return null
      }

      if (data?.id) {
        setProfileId(data.id)
        return data.id
      }
      return null
    } catch (e) {
      console.error('saveProfile exception:', e)
      return null
    }
  }

  async function searchUTR() {
    if (!utrSearch.trim()) return
    setUtrSearching(true)
    setUtrResults([])
    setUtrError('')
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: utrSearch,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setUtrResults(data.players)
      } else {
        setUtrError(data.error || 'Search failed')
      }
    } catch (e: unknown) {
      setUtrError(e instanceof Error ? e.message : 'Search failed')
    }
    setUtrSearching(false)
  }

  async function linkUTRPlayer(utrPlayer: { id: string | number }) {
    setUtrSyncing(true)
    setUtrError('')
    setUtrResults([])

    await saveProfile()

    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          utrPlayerId: utrPlayer.id.toString(),
          playerId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setUtrSearch('')
        await loadProfile()
      } else {
        setUtrError(data.error || 'Link failed')
      }
    } catch (e: unknown) {
      setUtrError(e instanceof Error ? e.message : 'Link failed')
    }
    setUtrSyncing(false)
  }

  async function syncUTR() {
    setUtrSyncing(true)
    setUtrError('')
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          playerId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        await loadProfile()
      } else {
        setUtrError(data.error || 'Sync failed')
      }
    } catch (e: unknown) {
      setUtrError(e instanceof Error ? e.message : 'Sync failed')
    }
    setUtrSyncing(false)
  }

  async function generateProjection() {
    setGenerating(true)
    setProjectionError('')

    const id = await saveProfile()

    if (!id) {
      setProjectionError(
        'Could not save profile. Check you are logged in and try again.',
      )
      setGenerating(false)
      return
    }

    try {
      const res = await fetch('/api/recruiting-projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: id,
          playerId,
          playerName,
          sport: sportInput || sport,
          gender,
          gradYear: gradYear ? parseInt(gradYear, 10) : null,
          gpa: gpa ? parseFloat(gpa) : null,
          wtnSingles: wtnSinglesInput
            ? parseFloat(wtnSinglesInput)
            : profile?.wtn_singles || null,
          utrSingles: utrSinglesInput ? parseFloat(utrSinglesInput) : null,
          nationalRank: nationalRankInput
            ? parseInt(nationalRankInput, 10)
            : profile?.usta_national_rank || null,
          sectionRank: sectionRankInput
            ? parseInt(sectionRankInput, 10)
            : profile?.usta_section_rank || null,
          winRecord: winLossInput
            ? parseInt(winLossInput.split('/')[0]?.trim() || '', 10) ||
              profile?.usta_win_record ||
              null
            : profile?.usta_win_record || null,
          lossRecord: winLossInput
            ? parseInt(winLossInput.split('/')[1]?.trim() || '', 10) ||
              profile?.usta_loss_record ||
              null
            : profile?.usta_loss_record || null,
          ageCategory: profile?.usta_age_category || null,
          targetDivision,
          geographicPreference: geoPreference || null,
          coachAssessment: coachAssessment || null,
          techniqueScore:
            analysisSessions?.[analysisSessions.length - 1]?.overall_score ||
            null,
          techniqueVelocity: techniqueStats?.velocity,
          topIssues: techniqueStats?.topIssues,
          fixedIssues: techniqueStats?.fixedIssues,
          sessionCount: analysisSessions?.length || 0,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(
          (errData as { error?: string }).error || `Server error ${res.status}`,
        )
      }

      const data = await res.json()
      if (data.success) {
        await loadProfile()
      } else {
        throw new Error(data.error || 'Projection failed')
      }
    } catch (e: unknown) {
      console.error('Projection error:', e)
      setProjectionError(
        e instanceof Error
          ? e.message
          : 'Something went wrong. Try again.',
      )
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

  async function suggestSchools() {
    setSuggestingSchools(true)
    setProjectionError('')
    const id = await saveProfile()
    if (!id) {
      setProjectionError('Save profile first, then try again.')
      setSuggestingSchools(false)
      return
    }
    try {
      const res = await fetch('/api/recruiting-projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'suggest_schools',
          profileId: id,
          playerName,
          sport: sportInput || sport,
          gender,
          gradYear: gradYear ? parseInt(gradYear, 10) : null,
          gpa: gpa ? parseFloat(gpa) : null,
          wtnSingles: wtnSinglesInput
            ? parseFloat(wtnSinglesInput)
            : profile?.wtn_singles || null,
          utrSingles: utrSinglesInput
            ? parseFloat(utrSinglesInput)
            : profile?.utr_singles || null,
          nationalRank: nationalRankInput
            ? parseInt(nationalRankInput, 10)
            : profile?.usta_national_rank || null,
          sectionRank: sectionRankInput
            ? parseInt(sectionRankInput, 10)
            : profile?.usta_section_rank || null,
          winRecord: winLossInput
            ? parseInt(winLossInput.split('/')[0]?.trim() || '', 10) ||
              profile?.usta_win_record ||
              null
            : profile?.usta_win_record || null,
          lossRecord: winLossInput
            ? parseInt(winLossInput.split('/')[1]?.trim() || '', 10) ||
              profile?.usta_loss_record ||
              null
            : profile?.usta_loss_record || null,
          targetDivision,
          geographicPreference: geoPreference || null,
          coachAssessment: coachAssessment || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Suggestions failed')
      await loadProfile()
    } catch (e: unknown) {
      setProjectionError(
        e instanceof Error ? e.message : 'Could not suggest schools',
      )
    }
    setSuggestingSchools(false)
  }

  async function verifySuggestedSchool(school: ViaSuggestedSchool) {
    if (!profileId) return
    setVerifyingSchool(school.school)
    const targets =
      (profile?.via_school_targets as Record<string, unknown[]>) || {}
    const type = school.type
    const list = Array.isArray(targets[type]) ? [...targets[type]] : []
    list.push({
      school: school.school,
      division: school.division,
      why: school.why,
      wtn_needed: school.wtn_needed,
      location: school.location,
      conference: school.conference,
    })
    const nextTargets = { ...targets, [type]: list }
    const remaining = parseSuggestedSchools(
      profile?.via_suggested_schools,
    ).filter(s => s.school !== school.school)
    await supabase
      .from('recruiting_profiles')
      .update({
        via_school_targets: nextTargets,
        via_suggested_schools: remaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
    await loadProfile()
    setVerifyingSchool(null)
  }

  async function dismissSuggestedSchool(school: ViaSuggestedSchool) {
    if (!profileId) return
    setVerifyingSchool(school.school)
    const remaining = parseSuggestedSchools(
      profile?.via_suggested_schools,
    ).filter(s => s.school !== school.school)
    await supabase
      .from('recruiting_profiles')
      .update({
        via_suggested_schools: remaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
    await loadProfile()
    setVerifyingSchool(null)
  }

  const projection = profile?.via_projection as
    | Record<string, unknown>
    | string
    | null
    | undefined
  const schoolTargets = profile?.via_school_targets
  const timeline = profile?.via_timeline
  const schools = flattenSchools(schoolTargets)
  const suggestedSchools = parseSuggestedSchools(
    profile?.via_suggested_schools,
  )
  const outlook = parseRecruitingOutlook(projection)
  const roadmap = outlook?.actions?.length
    ? outlook.actions.map(a => ({
        action: a.detail ? `${a.title} — ${a.detail}` : a.title,
      }))
    : roadmapItems(
        typeof projection === 'object' && projection
          ? (projection as Record<string, unknown>)
          : null,
        timeline,
      )
  const summary = outlook?.snapshot || projectionText(projection)
  const displaySport = sportInput || sport
  const initials = playerName
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const fieldInput: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 8,
    border: `0.5px solid ${BORDER}`,
    background: WARM_BG,
    fontSize: 12,
    color: TEXT,
    outline: 'none',
    fontFamily: 'Arial, sans-serif',
  }

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
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 0 40px',
      }}>

        {/* Hero header with rankings */}
        <div style={{
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          padding: '18px 20px',
          marginBottom: 12,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 16,
          }}>
            <div style={{
              width: 52, height: 52,
              borderRadius: '50%',
              background: '#E1F5EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 500,
              color: '#085041',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 20,
                fontWeight: 500,
                color: TEXT,
                marginBottom: 2,
              }}>
                {playerName}
              </div>
              <div style={{
                fontSize: 13,
                color: TEXT_MUTED,
              }}>
                {displaySport} · Class of {profile?.grad_year}
                {profile?.gpa ? ` · GPA ${profile.gpa}` : ''}
              </div>
            </div>
            {profile?.target_division && (
              <span style={{
                padding: '4px 12px',
                borderRadius: 999,
                background: '#E1F5EE',
                border: '0.5px solid #9FE1CB',
                fontSize: 11,
                color: '#085041',
                fontWeight: 500,
              }}>
                {String(profile.target_division).toUpperCase()} Target
              </span>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2,1fr)'
              : 'repeat(4,1fr)',
            gap: 10,
          }}>
            {[
              {
                value: profile?.utr_singles
                  ? Number(profile.utr_singles).toFixed(2)
                  : '—',
                label: 'UTR Singles',
                highlight: true,
              },
              {
                value: profile?.wtn_singles || '—',
                label: 'WTN Singles',
                highlight: false,
              },
              {
                value: profile?.usta_national_rank
                  ? `#${profile.usta_national_rank}`
                  : '—',
                label: 'National rank',
                highlight: false,
              },
              {
                value: profile?.usta_win_record != null &&
                  profile?.usta_loss_record != null
                  ? `${profile.usta_win_record}–${profile.usta_loss_record}`
                  : '—',
                label: 'Win / Loss',
                highlight: false,
              },
            ].map(stat => (
              <div key={stat.label} style={{
                textAlign: 'center',
                padding: '12px 8px',
                background: stat.highlight
                  ? '#E1F5EE' : WARM_BG,
                borderRadius: 10,
                border: stat.highlight
                  ? '0.5px solid #9FE1CB' : 'none',
              }}>
                <div style={{
                  fontSize: stat.highlight ? 28 : 22,
                  fontWeight: 500,
                  color: stat.highlight
                    ? '#085041' : TEXT,
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: 10,
                  color: stat.highlight
                    ? '#0F6E56' : TEXT_MUTED,
                  marginTop: 4,
                  fontWeight: stat.highlight ? 500 : 400,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {outlook && (
          <div style={{ marginBottom: 12 }}>
            <ViaRecruitingOutlookCard
              outlook={outlook}
              title="Via — recruiting outlook"
              compact
            />
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 12,
        }}>
          <div style={CARD}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: 10,
            }}>
              Target schools
            </div>
            {schools.map((school, i) => {
              const c = SCHOOL_COLORS[school.type] || SCHOOL_COLORS.target
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: c.bg,
                  border: `0.5px solid ${c.border}`,
                  marginBottom: 6,
                }}>
                  <div style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: c.dot,
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: c.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {school.name}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: c.sub,
                    }}>
                      {school.division} ·{' '}
                      {school.type.charAt(0).toUpperCase() +
                        school.type.slice(1)}
                    </div>
                  </div>
                </div>
              )
            })}
            {schools.length === 0 && (
              <div style={{
                fontSize: 12,
                color: TEXT_MUTED,
                textAlign: 'center',
                padding: '16px 0',
              }}>
                Your coach hasn&apos;t added schools yet
              </div>
            )}
          </div>

          <div style={CARD}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: 10,
            }}>
              What needs to happen
            </div>
            {roadmap.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                {roadmap.slice(0, 4).map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}>
                    <div style={{
                      width: 18, height: 18,
                      borderRadius: '50%',
                      background: i === 0 ? TEAL : WARM_BG,
                      border: i === 0
                        ? 'none'
                        : `0.5px solid ${BORDER}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      {i === 0 ? (
                        <svg width="10" height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 500,
                          color: TEXT_MUTED,
                        }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: TEXT,
                      lineHeight: 1.5,
                    }}>
                      {item.action}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: 12,
                color: TEXT_MUTED,
                textAlign: 'center',
                padding: '16px 0',
              }}>
                Generate a Via projection to see
                your recruiting roadmap
              </div>
            )}
          </div>
        </div>

        {typeof projection === 'object' && projection?.disclaimer && (
          <div style={{
            fontSize: 11,
            color: TEXT_MUTED,
            lineHeight: 1.55,
            padding: '10px 12px',
            background: WARM_BG,
            borderRadius: 10,
            fontStyle: 'italic',
            marginTop: 12,
          }}>
            {String(projection.disclaimer)}
          </div>
        )}

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
              'MMM d, yyyy',
            )}
          </div>
        )}
      </div>
    )
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
  }

  const utrSection = (
    <div style={{
      background: 'white',
      border: `0.5px solid ${BORDER}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 14,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: TEXT_MUTED,
          textTransform: 'uppercase' as const,
          letterSpacing: '.07em',
        }}>
          UTR
        </div>
        {profile?.utr_player_id && (
          <button
            type="button"
            onClick={syncUTR}
            disabled={utrSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 9px',
              borderRadius: 7,
              border: `0.5px solid ${BORDER}`,
              background: 'white',
              fontSize: 11,
              color: TEXT_MUTED,
              cursor: utrSyncing ? 'default' : 'pointer',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {utrSyncing ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>

      {profile?.utr_player_id ? (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: '#E1F5EE',
            borderRadius: 10,
            border: '0.5px solid #9FE1CB',
            marginBottom: 10,
          }}>
            <div>
              <div style={{
                fontSize: 32,
                fontWeight: 500,
                color: '#085041',
                lineHeight: 1,
              }}>
                {profile.utr_singles != null
                  ? Number(profile.utr_singles).toFixed(2)
                  : '—'}
              </div>
              <div style={{
                fontSize: 11,
                color: '#0F6E56',
                marginTop: 2,
              }}>
                UTR Singles
              </div>
            </div>
            {profile.utr_doubles > 0 && (
              <>
                <div style={{
                  width: 1,
                  height: 36,
                  background: '#9FE1CB',
                }} />
                <div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: '#085041',
                    lineHeight: 1,
                  }}>
                    {Number(profile.utr_doubles).toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#0F6E56',
                    marginTop: 2,
                  }}>
                    UTR Doubles
                  </div>
                </div>
              </>
            )}
            {profile.utr_status && (
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: '#085041',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 500,
                }}>
                  {profile.utr_status}
                </span>
              </div>
            )}
          </div>

          {profile.schedule_strength_score != null && (
            <div style={{
              padding: '10px 12px',
              background: WARM_BG,
              borderRadius: 9,
              border: `0.5px solid ${BORDER}`,
              marginBottom: 10,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: TEXT,
                }}>
                  Schedule strength
                </span>
                <span style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: profile.schedule_strength_score >= 70
                    ? '#085041'
                    : profile.schedule_strength_score >= 40
                      ? '#633806'
                      : '#A32D2D',
                }}>
                  {profile.schedule_strength_score}/100
                </span>
              </div>
              <div style={{
                height: 5,
                background: BORDER,
                borderRadius: 3,
                overflow: 'hidden',
                marginBottom: 7,
              }}>
                <div style={{
                  height: 5,
                  width: `${profile.schedule_strength_score}%`,
                  background: profile.schedule_strength_score >= 70
                    ? '#1D9E75'
                    : profile.schedule_strength_score >= 40
                      ? '#EF9F27'
                      : '#E24B4A',
                  borderRadius: 3,
                }} />
              </div>
              <div style={{
                display: 'flex',
                gap: 12,
                marginBottom: 5,
              }}>
                {[
                  {
                    value: profile.schedule_avg_opponent_utr?.toFixed(1) || '—',
                    label: 'Avg opponent',
                  },
                  {
                    value: profile.schedule_highest_utr_beaten?.toFixed(1) || '—',
                    label: 'Highest beaten',
                  },
                  {
                    value: profile.schedule_quality_wins || 0,
                    label: 'Quality wins',
                  },
                  {
                    value: `${profile.schedule_win_rate_vs_higher || 0}%`,
                    label: 'Win vs higher',
                  },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: TEXT,
                      lineHeight: 1,
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontSize: 9,
                      color: TEXT_MUTED,
                      marginTop: 2,
                    }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
              {profile.schedule_summary && (
                <div style={{
                  fontSize: 11,
                  color: TEXT_SEC,
                  lineHeight: 1.55,
                  fontStyle: 'italic',
                }}>
                  {profile.schedule_summary}
                </div>
              )}
            </div>
          )}

          <div style={{
            fontSize: 10,
            color: TEXT_MUTED,
          }}>
            {profile.utr_display_name && `${profile.utr_display_name} · `}
            {profile.last_synced_at
              ? `Synced ${format(new Date(profile.last_synced_at), 'MMM d, h:mm a')}`
              : 'Not yet synced'}
          </div>
        </>
      ) : (
        <>
          <p style={{
            fontSize: 12,
            color: TEXT_MUTED,
            marginBottom: 10,
            lineHeight: 1.55,
          }}>
            Link {playerName}&apos;s UTR account to automatically sync ratings and
            schedule strength. One-time setup.
          </p>

          <div style={{
            display: 'flex',
            gap: 7,
            marginBottom: 8,
          }}>
            <input
              value={utrSearch}
              onChange={e => setUtrSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') searchUTR()
              }}
              placeholder={`Search "${playerName}" on UTR`}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 9,
                border: `0.5px solid ${BORDER}`,
                background: WARM_BG,
                fontSize: 13,
                color: TEXT,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={searchUTR}
              disabled={utrSearching || !utrSearch.trim()}
              style={{
                padding: '9px 16px',
                borderRadius: 9,
                background: utrSearching ? BORDER : TEAL,
                border: 'none',
                color: 'white',
                fontSize: 12,
                fontWeight: 500,
                cursor: utrSearching ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              {utrSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {utrResults.length > 0 && (
            <div style={{
              border: `0.5px solid ${BORDER}`,
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              {utrResults.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 13px',
                    borderTop: i > 0 ? `0.5px solid ${BORDER}` : 'none',
                    background: i % 2 === 0 ? 'white' : WARM_BG,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: TEXT,
                      marginBottom: 1,
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                    }}>
                      UTR {p.singlesUtr || '—'}
                      {p.location ? ` · ${p.location}` : ''}
                      {p.ageRange ? ` · ${p.ageRange}` : ''}
                      {p.gradYear ? ` · Class of ${p.gradYear}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => linkUTRPlayer(p)}
                    disabled={utrSyncing}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: utrSyncing ? BORDER : TEAL,
                      border: 'none',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: utrSyncing ? 'default' : 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {utrSyncing ? 'Linking...' : 'Link →'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {utrError && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: '#FEF2F2',
          border: '0.5px solid #FCA5A5',
          fontSize: 11,
          color: '#A32D2D',
          marginTop: 6,
        }}>
          {utrError}
        </div>
      )}
    </div>
  )

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      color: TEXT,
      maxWidth: 1100,
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

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
          <p style={{ fontSize: 12, color: TEXT_MUTED }}>
            {playerName} · {displaySport}
          </p>
        </div>
        {profile?.published_to_family && (
          <div style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: '#E1F5EE',
            border: '0.5px solid rgba(29,158,117,.2)',
            fontSize: 11,
            color: '#0F6E56',
            fontWeight: 600,
          }}>
            ✓ Published to family
          </div>
        )}
      </div>

      {techniqueStats && (
        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
          padding: '10px 14px',
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>
            Technique score{' '}
            <strong style={{ color: TEXT }}>
              {techniqueStats.currentScore}
            </strong>
          </span>
          {techniqueStats.velocity && (
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>
              Velocity{' '}
              <strong style={{ color: TEAL }}>
                {techniqueStats.velocity}/session
              </strong>
            </span>
          )}
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>
            {techniqueStats.sessionCount} sessions analyzed
          </span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '1fr'
          : 'minmax(0,2fr) minmax(0,3fr)',
        gap: 14,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Player header */}
          <div style={CARD}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: '#E1F5EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 500,
                color: '#085041',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: TEXT,
                }}>
                  {playerName}
                </div>
                <div style={{
                  fontSize: 12,
                  color: TEXT_MUTED,
                }}>
                  {displaySport} · {gender} · Class of {gradYear || '—'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}>
              {[
                {
                  label: 'Sport',
                  value: sportInput,
                  set: setSportInput,
                  type: 'select' as const,
                  options: ['tennis', 'golf', 'baseball', 'basketball', 'pickleball'],
                },
                {
                  label: 'Grad year',
                  value: gradYear,
                  set: setGradYear,
                  placeholder: '2027',
                },
                {
                  label: 'GPA',
                  value: gpa,
                  set: setGpa,
                  placeholder: '3.8',
                },
                {
                  label: 'Gender',
                  value: gender,
                  set: setGender,
                  type: 'select' as const,
                  options: ['male', 'female'],
                },
              ].map(field => (
                <div key={field.label}>
                  <div style={{
                    fontSize: 11,
                    color: TEXT_MUTED,
                    marginBottom: 4,
                  }}>
                    {field.label}
                  </div>
                  {field.type === 'select' ? (
                    <select
                      value={field.value}
                      onChange={e => field.set(e.target.value)}
                      style={fieldInput}
                    >
                      {field.options!.map(o => (
                        <option key={o} value={o}>
                          {o.charAt(0).toUpperCase() + o.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={field.value || ''}
                      onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      style={fieldInput}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {utrSection}

          {/* Rankings */}
          <div style={CARD}>
            <div style={{ ...sectionLabel, marginBottom: 12 }}>
              Rankings
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              marginBottom: 10,
            }}>
              {[
                {
                  value: wtnSinglesInput || '—',
                  label: 'WTN Singles',
                },
                {
                  value: nationalRankInput
                    ? `#${nationalRankInput}` : '—',
                  label: 'National',
                },
                {
                  value: sectionRankInput
                    ? `#${sectionRankInput}` : '—',
                  label: 'Section',
                },
              ].map(stat => (
                <div key={stat.label} style={{
                  textAlign: 'center',
                  padding: '10px 8px',
                  background: WARM_BG,
                  borderRadius: 9,
                }}>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 500,
                    color: '#085041',
                    lineHeight: 1,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: TEXT_MUTED,
                    marginTop: 3,
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              background: WARM_BG,
              borderRadius: 8,
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                Win / Loss
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: TEXT,
              }}>
                {winLossInput || '—'}
              </span>
            </div>

            <div style={{
              borderTop: `0.5px solid ${BORDER}`,
              paddingTop: 10,
              marginBottom: 10,
            }}>
              <div style={{
                fontSize: 10,
                color: TEXT_MUTED,
                marginBottom: 6,
              }}>
                Update manually after tournaments
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 6,
              }}>
                {[
                  {
                    label: 'WTN',
                    value: wtnSinglesInput,
                    set: setWtnSinglesInput,
                    placeholder: '9.1',
                  },
                  {
                    label: 'Nat. rank',
                    value: nationalRankInput,
                    set: setNationalRankInput,
                    placeholder: '51',
                  },
                  {
                    label: 'W/L',
                    value: winLossInput,
                    set: setWinLossInput,
                    placeholder: '63/33',
                  },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{
                      fontSize: 9,
                      color: TEXT_MUTED,
                      marginBottom: 3,
                    }}>
                      {f.label}
                    </div>
                    <input
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      style={{
                        ...fieldInput,
                        padding: '6px 8px',
                        fontSize: 11,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Target division */}
          <div style={CARD}>
            <div style={{ ...sectionLabel, marginBottom: 10 }}>
              Target division
            </div>
            <div style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 10,
            }}>
              {['D1', 'D2', 'D3', 'NAIA', 'JC'].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTargetDivision(d)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: '0.5px solid',
                    borderColor:
                      targetDivision?.toUpperCase() === d
                        ? '#085041' : BORDER,
                    background:
                      targetDivision?.toUpperCase() === d
                        ? '#085041' : 'white',
                    color:
                      targetDivision?.toUpperCase() === d
                        ? 'white' : TEXT_MUTED,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div>
              <div style={{
                fontSize: 11,
                color: TEXT_MUTED,
                marginBottom: 4,
              }}>
                Geographic preference
              </div>
              <input
                value={geoPreference}
                onChange={e => setGeoPreference(e.target.value)}
                placeholder="e.g. Southeast, Mid-Atlantic"
                style={{ ...fieldInput, padding: '8px 10px' }}
              />
            </div>
          </div>

          {/* Coach assessment */}
          <div style={CARD}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>
              Coach assessment
            </div>
            <textarea
              value={coachAssessment}
              onChange={e => setCoachAssessment(e.target.value)}
              placeholder={`e.g. ${firstName} has D1 upside but needs 1.5 more UTR points...`}
              rows={4}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 9,
                border: `0.5px solid ${BORDER}`,
                background: WARM_BG,
                fontSize: 13,
                color: TEXT,
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.6,
                fontFamily: 'Arial, sans-serif',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => { saveProfile() }}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: 10,
              background: TEAL,
              border: 'none',
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Save details
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Via projection */}
          <div>
            {outlook ? (
              <div style={{ marginBottom: 10 }}>
                <ViaRecruitingOutlookCard
                  outlook={outlook}
                  title="Via projection"
                  generatedAt={
                    profile?.via_generated_at
                      ? format(
                          new Date(profile.via_generated_at),
                          'MMM d',
                        )
                      : profile?.updated_at
                        ? format(
                            new Date(profile.updated_at),
                            'MMM d',
                          )
                        : null
                  }
                />
              </div>
            ) : (
              <div style={{
                background: '#E1F5EE',
                border: '0.5px solid #9FE1CB',
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: 10,
              }}>
                <p style={{
                  fontSize: 13,
                  color: '#0F6E56',
                  lineHeight: 1.6,
                  margin: 0,
                  fontStyle: 'italic',
                }}>
                  Fill in rankings and assessment,
                  then generate a Via projection.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={generateProjection}
                disabled={generating}
                style={{
                  padding: '8px 16px',
                  borderRadius: 9,
                  background: generating ? '#9FE1CB' : '#085041',
                  border: 'none',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: generating ? 'default' : 'pointer',
                }}
              >
                {generating ? 'Generating...' : outlook
                  ? 'Regenerate projection'
                  : 'Generate with Via →'}
              </button>
            </div>

            {projectionError && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '0.5px solid #FCA5A5',
                fontSize: 12,
                color: '#A32D2D',
              }}>
                {projectionError}
              </div>
            )}
          </div>

          {/* School targets */}
          <div style={CARD}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              gap: 8,
              flexWrap: 'wrap',
            }}>
              <div style={sectionLabel}>
                School targets
              </div>
              <button
                type="button"
                onClick={suggestSchools}
                disabled={suggestingSchools}
                style={{
                  fontSize: 11,
                  color: TEAL,
                  background: 'none',
                  border: 'none',
                  cursor: suggestingSchools ? 'default' : 'pointer',
                  fontWeight: 500,
                }}
              >
                {suggestingSchools ? 'Suggesting...' : '+ Suggest with Via'}
              </button>
            </div>
            <ViaSchoolSuggestionsCard
              schools={suggestedSchools}
              onVerify={verifySuggestedSchool}
              onDismiss={dismissSuggestedSchool}
              verifying={verifyingSchool}
            />
            {schools.length === 0 ? (
              <p style={{
                fontSize: 12,
                color: TEXT_MUTED,
                margin: 0,
              }}>
                Generate a Via projection to populate school targets.
              </p>
            ) : (
              schools.map((school, i) => {
                const c = SCHOOL_COLORS[school.type] || SCHOOL_COLORS.target
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 9,
                    background: c.bg,
                    border: `0.5px solid ${c.border}`,
                    marginBottom: 6,
                  }}>
                    <div style={{
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: c.dot,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: c.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {school.name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: c.sub,
                      }}>
                        {school.division}
                        {school.conference
                          ? ` · ${school.conference}` : ''}
                        {school.location
                          ? ` · ${school.location}` : ''}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 9px',
                      borderRadius: 999,
                      background: c.badge,
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 500,
                      flexShrink: 0,
                      textTransform: 'capitalize',
                    }}>
                      {school.type}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Timeline */}
          {Array.isArray(timeline) && timeline.length > 0 && (
            <div style={CARD}>
              <div style={{ ...sectionLabel, marginBottom: 12 }}>
                Recruiting timeline
              </div>
              {timeline.map((phase: { timeframe?: string; description?: string }, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    paddingBottom: i < timeline.length - 1 ? 14 : 0,
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
                      background: i === 0 ? TEAL : i === 1 ? AMBER : PURPLE,
                      marginTop: 3,
                    }} />
                    {i < timeline.length - 1 && (
                      <div style={{
                        width: 1.5,
                        flex: 1,
                        background: BORDER,
                        marginTop: 3,
                        minHeight: 20,
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
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
              ))}
            </div>
          )}

          {outlook && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <button
                type="button"
                onClick={publishToFamily}
                disabled={publishing}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 12,
                  background: publishing ? '#ccc' : TEAL,
                  border: 'none',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: publishing ? 'default' : 'pointer',
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
      </div>
    </div>
  )

}
