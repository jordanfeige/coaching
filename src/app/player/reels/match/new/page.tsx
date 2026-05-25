import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { MatchUploadClient } from '@/components/player/reels/MatchUploadClient'

export const dynamic = 'force-dynamic'

export default async function MatchUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ matchId?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  if (!isFilmRoomEnabled(user)) {
    redirect('/player/reels')
  }

  const { matchId } = await searchParams

  return <MatchUploadClient initialMatchId={matchId ?? null} />
}
