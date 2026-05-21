'use client'

import AnalysisResultStepper, {
  mapAnalysisIssues,
  mapAnalysisStrengths,
  type AnalysisViewMode,
  type CoachReviewConfig,
} from '@/components/AnalysisResultStepper'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { JointMeasurement } from '@/lib/poseAnalysis'
import { analysisScore, type AnalysisRecord } from '@/lib/analysis-display'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysis: AnalysisRecord | null
  sport: string
  shotType?: string
  sessionId?: string
  playerId?: string
  poseMeasurements?: JointMeasurement[]
  coachReview?: CoachReviewConfig
  progressHref?: string
  analyzedAt?: string
  viewMode?: AnalysisViewMode
  existingDrillTitles?: string[]
  onSaved?: () => void
  onReanalyze?: () => void
}

export default function AnalysisStepperDialog({
  open,
  onOpenChange,
  analysis,
  sport,
  shotType,
  sessionId,
  playerId,
  poseMeasurements,
  coachReview,
  progressHref,
  analyzedAt,
  viewMode = 'first-view',
  existingDrillTitles,
  onSaved,
  onReanalyze,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto p-4 sm:max-w-md">
        {analysis ? (
          <AnalysisResultStepper
            score={analysisScore(analysis)}
            sport={sport}
            shotType={shotType}
            issues={mapAnalysisIssues(
              (analysis.areas_to_improve ?? analysis.issues) as unknown[] | undefined,
            )}
            strengths={mapAnalysisStrengths(analysis.strengths as unknown[] | undefined)}
            poseMeasurements={poseMeasurements}
            sessionId={sessionId}
            playerId={playerId}
            progressHref={progressHref}
            analyzedAt={analyzedAt}
            viewMode={viewMode}
            existingDrillTitles={existingDrillTitles}
            onSaved={onSaved}
            onReanalyze={onReanalyze}
            coachReview={coachReview}
          />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No analysis available for this clip yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
