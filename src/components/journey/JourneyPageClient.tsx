'use client'

import type { JourneyPageViewModel } from '@/lib/journey-types'
import JourneyRatingOnly from '@/components/player/journey/JourneyRatingOnly'
import { usePageReady } from '@/contexts/PageLoadingContext'

type Props = {
  data: JourneyPageViewModel
}

export default function JourneyPageClient({ data }: Props) {
  usePageReady(true)
  return <JourneyRatingOnly data={data} />
}
