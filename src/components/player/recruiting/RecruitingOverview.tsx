'use client'

import { useState } from 'react'
import { ProfileCard } from '@/components/player/recruiting/ProfileCard'
import { usePageReady } from '@/contexts/PageLoadingContext'
import { CollegesSummary } from '@/components/player/recruiting/CollegesSummary'
import { ExposureSummary } from '@/components/player/recruiting/ExposureSummary'
import { TrajectoryRecruitingCard } from '@/components/player/recruiting/TrajectoryRecruitingCard'
import type { RecruitingOverviewData } from '@/lib/recruiting-overview-load'

type Props = {
  data: RecruitingOverviewData
}

export function RecruitingOverview({ data }: Props) {
  const [trajectoryReady, setTrajectoryReady] = useState(false)
  usePageReady(trajectoryReady)

  return (
    <div>
      <ProfileCard
        playerName={data.playerName}
        playerInitials={data.playerInitials}
        bracket={data.bracketLabel}
        classYear={data.classYear}
        goalLabel={data.goalLabel}
        location={data.location}
        currentUtr={data.currentUtr}
        journeyRating={data.journeyRating}
        journeyTier={data.journeyTier}
        projectedUtr={data.projectedUtr}
        collegeMatchCount={data.collegeMatchCount}
      />

      <TrajectoryRecruitingCard onReadyChange={setTrajectoryReady} />

      <CollegesSummary
        reachCount={data.collegeBuckets.reach}
        reachLabel={data.collegeBuckets.reachLabel}
        targetCount={data.collegeBuckets.target}
        targetLabel={data.collegeBuckets.targetLabel}
        safetyCount={data.collegeBuckets.safety}
        safetyLabel={data.collegeBuckets.safetyLabel}
        totalCount={data.collegeBuckets.total}
      />

      <ExposureSummary
        qualityWins={data.exposure.qualityWins}
        topEvent={data.exposure.topEvent}
        exposureScore={data.exposure.exposureScore}
        exposureMax={data.exposure.exposureMax}
      />
    </div>
  )
}
