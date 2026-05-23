import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ matchId: string; sequenceNumber: string }>
}

export default async function MatchSegmentRedirect({ params }: Props) {
  const { matchId } = await params
  redirect(`/player/reels/match/${matchId}`)
}
