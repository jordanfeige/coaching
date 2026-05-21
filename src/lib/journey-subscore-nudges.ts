import type { CategoryKey } from '@/lib/journey-types'
import { D1_MID_MAJOR_TARGET } from '@/lib/trajectory-copy'

export type SubScoreNudgeContext = {
  currentUtr: number | null
  hasTranscript: boolean
  gpa: number | null
  hasSat: boolean
  hasAct: boolean
  thisWeekReels: number
  thisWeekDrillsCompleted: number
  qualityWinsLast30Days: number
}

export type SubScoreNudge = {
  text: string
  isWarn: boolean
}

export function deriveSubScoreNudge(
  category: CategoryKey,
  ctx: SubScoreNudgeContext,
): SubScoreNudge {
  switch (category) {
    case 'tennis': {
      if (ctx.currentUtr == null || ctx.currentUtr <= 0) {
        return { text: 'Add UTR to start', isWarn: true }
      }
      const gap = D1_MID_MAJOR_TARGET - ctx.currentUtr
      if (gap <= 0) return { text: 'At D1 level', isWarn: false }
      return {
        text: `+${gap.toFixed(2)} UTR to D1`,
        isWarn: false,
      }
    }
    case 'academics': {
      if (!ctx.hasTranscript) {
        return { text: 'Upload transcript +6', isWarn: true }
      }
      if (ctx.gpa == null) return { text: 'Add GPA +4', isWarn: true }
      if (!ctx.hasSat && !ctx.hasAct) {
        return { text: 'Add test scores +5', isWarn: true }
      }
      return { text: 'All inputs verified', isWarn: false }
    }
    case 'coachability': {
      if (ctx.thisWeekReels === 0) {
        return { text: 'Log 1 reel +2', isWarn: false }
      }
      if (ctx.thisWeekDrillsCompleted < 4) {
        const left = 4 - ctx.thisWeekDrillsCompleted
        return {
          text: `Complete ${left} drill${left === 1 ? '' : 's'} +3`,
          isWarn: false,
        }
      }
      return { text: 'Stay consistent', isWarn: false }
    }
    case 'exposure': {
      if (ctx.qualityWinsLast30Days < 2) {
        const left = 2 - ctx.qualityWinsLast30Days
        return {
          text: `Win ${left} quality match${left === 1 ? '' : 'es'} +4`,
          isWarn: false,
        }
      }
      return { text: 'Strong exposure', isWarn: false }
    }
    default:
      return { text: 'View breakdown', isWarn: false }
  }
}
