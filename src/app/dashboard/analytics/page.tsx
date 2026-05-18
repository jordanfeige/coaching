import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PulseClient from './PulseClient'

type PulsePlayer = {
  id: string
  name: string | null
  sport: string | null
  skill_level: string | null
  age: number | null
  email?: string | null
}

export default async function PulsePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const playersWithEmailResult = await supabase
    .from('players')
    .select('id, name, sport, skill_level, age, email')
    .order('name')
  let players = (playersWithEmailResult.data || []) as PulsePlayer[]

  if (playersWithEmailResult.error?.message?.includes('players.email')) {
    const playersWithoutEmailResult = await supabase
      .from('players')
      .select('id, name, sport, skill_level, age')
      .order('name')
    players = (playersWithoutEmailResult.data || []) as PulsePlayer[]
  }

  const playerIds = players.map(player => player.id)

  const { data: playerLinkedSessions } = playerIds.length > 0
    ? await supabase
        .from('analysis_sessions')
        .select('*')
        .in('player_id', playerIds)
        .order('analyzed_at', { ascending: false })
    : { data: [] }

  const { data: userLinkedSessions } = await supabase
    .from('analysis_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('analyzed_at', { ascending: false })

  const allRaw = [...(playerLinkedSessions || []), ...(userLinkedSessions || [])]
  const seenIds = new Set<string>()
  const sessions = allRaw.filter(session => {
    if (seenIds.has(session.id)) return false
    seenIds.add(session.id)
    return true
  })

  const lessonWindowStart = new Date()
  lessonWindowStart.setDate(lessonWindowStart.getDate() - 30)

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, player_id, starts_at, status')
    .gte('starts_at', lessonWindowStart.toISOString())
    .order('starts_at', { ascending: false })

  return (
    <PulseClient
      players={players}
      sessions={sessions}
      lessons={lessons || []}
      coachEmail={user.email || ''}
    />
  )
}
