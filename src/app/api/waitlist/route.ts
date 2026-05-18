import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendBetaApproved } from '@/lib/email'
import { isAdmin } from '@/lib/admin'

/*
-- Run in Supabase SQL editor:
-- create table waitlist (
--   id uuid primary key default gen_random_uuid(),
--   email text unique not null,
--   sport text,
--   source text default 'pricing',
--   created_at timestamptz default now()
-- );
*/

type WaitlistEntry = {
  id: string
  email: string
  sport: string | null
  source: string | null
  created_at: string
}

type ProfileGrowthRow = {
  id: string
  email: string | null
  role: string | null
  sport?: string | null
  analyses_used?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type PendingBetaUser = {
  id: string
  email: string | null
  full_name?: string | null
  role: string | null
  sport?: string | null
  created_at: string | null
  beta_status: string | null
}

type FeedbackRow = {
  rating: string
  sport: string | null
  comment: string | null
  created_at: string
  feedback_type: string
}

type AuthUserMetadata = {
  sports?: unknown
  sport?: unknown
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', status: 401 as const }

  if (!isAdmin(user.email)) return { error: 'Not authorized', status: 403 as const }
  return { user }
}

export async function POST(req: NextRequest) {
  try {
    const { email, sport, source } = await req.json()
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { error } = await adminClient().from('waitlist').insert({
      email: normalizedEmail,
      sport: sport || null,
      source: source || 'pricing',
    })

    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not join waitlist' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabaseAdmin = adminClient()
  const waitlistResult = await supabaseAdmin
    .from('waitlist')
    .select('id, email, sport, source, created_at')
    .order('created_at', { ascending: false })

  const waitlistMissing = Boolean(
    waitlistResult.error?.message?.includes("Could not find the table 'public.waitlist'") ||
    waitlistResult.error?.message?.includes('schema cache')
  )
  if (waitlistResult.error && !waitlistMissing) {
    return NextResponse.json({ error: waitlistResult.error.message }, { status: 500 })
  }

  async function loadProfiles(select: string) {
    return supabaseAdmin
      .from('profiles')
      .select(select)
      .eq('role', 'player')
      .order('created_at', { ascending: false })
  }

  let profilesResponse = await loadProfiles('id, email, role, sport, analyses_used, created_at, updated_at')
  if (profilesResponse.error) {
    profilesResponse = await loadProfiles('id, email, role, analyses_used, created_at, updated_at')
  }
  if (profilesResponse.error) {
    profilesResponse = await loadProfiles('id, email, role, created_at, updated_at')
  }
  if (profilesResponse.error) {
    profilesResponse = await loadProfiles('id, email, role')
  }
  if (profilesResponse.error) {
    return NextResponse.json({ error: profilesResponse.error.message }, { status: 500 })
  }

  const profiles = (profilesResponse.data ?? []) as unknown as ProfileGrowthRow[]
  const authSportsByUser = new Map<string, string[]>()
  try {
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    for (const user of authUsers.users) {
      const metadata = user.user_metadata as AuthUserMetadata
      const rawSports = Array.isArray(metadata?.sports)
        ? metadata.sports
        : metadata?.sport
          ? [metadata.sport]
          : []
      const sports = rawSports.filter((sport): sport is string => typeof sport === 'string')
      if (sports.length) authSportsByUser.set(user.id, sports)
    }
  } catch {
    // Auth metadata is a best-effort source for consumer-selected sports.
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const sportsBreakdown: Record<string, number> = {
    tennis: 0,
    golf: 0,
    baseball: 0,
    basketball: 0,
  }

  for (const profile of profiles) {
    const sports = authSportsByUser.get(profile.id) ?? (profile.sport ? [profile.sport] : [])
    for (const sport of sports) {
      const key = sport.toLowerCase()
      if (key in sportsBreakdown) sportsBreakdown[key] += 1
    }
  }

  const waitlistEntries = waitlistMissing ? [] : (waitlistResult.data ?? []) as WaitlistEntry[]
  const totalAnalysesRun = profiles.reduce((sum, profile) => sum + (Number(profile.analyses_used) || 0), 0)
  const { data: pending } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, sport, created_at, beta_status')
    .or('beta_status.eq.pending,beta_status.is.null')
    .neq('email', 'jordanfeige@gmail.com')
    .order('created_at', { ascending: false })
  const pendingBetaUsers = (pending ?? []) as PendingBetaUser[]
  const feedbackResult = await supabaseAdmin
    .from('analysis_feedback')
    .select('rating, sport, comment, created_at, feedback_type')
    .order('created_at', { ascending: false })
    .limit(50)
  const feedbackMissing = Boolean(
    feedbackResult.error?.message?.includes("Could not find the table 'public.analysis_feedback'") ||
    feedbackResult.error?.message?.includes('schema cache')
  )
  const feedbackStats = feedbackMissing ? [] : (feedbackResult.data ?? []) as FeedbackRow[]

  return NextResponse.json({
    entries: waitlistEntries,
    waitlistAvailable: !waitlistMissing,
    stats: {
      totalSignups: profiles.length,
      signupsThisWeek: profiles.filter(profile => profile.created_at && new Date(profile.created_at) >= sevenDaysAgo).length,
      totalAnalysesRun,
      waitlistCount: waitlistEntries.length,
      analysesToday: profiles.filter(profile => profile.updated_at && new Date(profile.updated_at) >= startOfToday).length,
    },
    recentSignups: profiles.slice(0, 20).map(profile => {
      const sports = authSportsByUser.get(profile.id) ?? (profile.sport ? [profile.sport] : [])
      return {
        id: profile.id,
        email: profile.email,
        sport: sports.join(', ') || null,
        analyses_used: Number(profile.analyses_used) || 0,
        created_at: profile.created_at || null,
      }
    }),
    pendingBetaUsers,
    feedbackStats,
    sportsBreakdown,
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id, beta_status } = await req.json()
    if (!id || !['approved', 'rejected', 'pending'].includes(beta_status)) {
      return NextResponse.json({ error: 'Valid user id and beta status are required' }, { status: 400 })
    }

    const { data: user, error } = await adminClient()
      .from('profiles')
      .update({ beta_status })
      .eq('id', id)
      .select('id, email, full_name, role, sport, beta_status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (beta_status === 'approved' && user?.email) {
      await sendBetaApproved({
        to: user.email,
        name: user.full_name || user.email.split('@')[0],
        role: user.role === 'coach' ? 'coach' : 'player',
      })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update beta status' },
      { status: 500 }
    )
  }
}
