import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { MatchFilmDetailClient } from '@/components/player/reels/MatchFilmDetailClient'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ matchId: string }>
}

export default async function MatchDetailPage({ params }: Props) {
  const { matchId } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  if (!isFilmRoomEnabled(user)) {
    redirect('/player/reels')
  }

  return <MatchFilmDetailClient matchId={matchId} />
}
