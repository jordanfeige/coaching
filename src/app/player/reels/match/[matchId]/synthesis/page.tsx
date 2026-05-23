import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ matchId: string }>
}

export default async function MatchSynthesisRedirect({ params }: Props) {
  const { matchId } = await params
  redirect(`/player/reels/match/${matchId}`)
}
