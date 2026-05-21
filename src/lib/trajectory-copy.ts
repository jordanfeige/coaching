import type { TrajectoryPoint } from '@/lib/utr-forecast'
import { utrAtAge } from '@/lib/trajectory-chart-math'

export const D1_MID_MAJOR_TARGET = 11.3
const PROGRESS_FLOOR = 6

export function peerUtrAtGraduation(
  peerCohort: TrajectoryPoint[],
  graduationAge: number,
): number | null {
  const exact = peerCohort.find(p => Math.abs(p.age - graduationAge) < 0.05)
  if (exact) return exact.utr
  return utrAtAge(peerCohort, graduationAge)
}

export function formatDelta(delta: number): string {
  if (delta >= 0) return `↑ ${delta.toFixed(1)}`
  return `−${Math.abs(delta).toFixed(1)}`
}

/** Top % vs cohort benchmark at current age (lower = stronger vs peers). */
export function utrTopPercentileVsPeers(
  currentUtr: number,
  peerCohort: TrajectoryPoint[],
  currentAge: number,
): number | null {
  const peerAtAge = utrAtAge(peerCohort, currentAge)
  if (peerAtAge == null) return null
  const diff = currentUtr - peerAtAge
  const topPct = Math.round(50 - diff * 32)
  return Math.min(99, Math.max(1, topPct))
}

export function progressPctTowardTarget(
  projectedUtr: number,
  targetUtr: number,
): number {
  const span = targetUtr - PROGRESS_FLOOR
  if (span <= 0) return 0
  return Math.min(100, Math.max(0, ((projectedUtr - PROGRESS_FLOOR) / span) * 100))
}

export function climbPerYear(
  currentUtr: number,
  projectedUtr: number,
  currentAge: number,
  graduationAge: number,
): string {
  const years = Math.max(0.5, graduationAge - currentAge)
  const pace = (projectedUtr - currentUtr) / years
  return pace >= 0 ? `+${pace.toFixed(1)}` : pace.toFixed(1)
}

export function deriveConfidenceTagline(
  climbAmount: number,
  d1Delta: number,
): string {
  const climb = climbAmount.toFixed(1)
  if (d1Delta >= 0) {
    return 'Elite pace — projecting above D1 mid-major average. Power Five programs are realistic.'
  }
  if (d1Delta >= -1.0) {
    return `A ${climb}-point climb to graduation — D1 mid-major and competitive D2 are in range.`
  }
  if (d1Delta >= -2.0) {
    return `A ${climb}-point climb to graduation — that opens the door to D2 and D3 programs.`
  }
  if (d1Delta >= -3.0) {
    return `A steady ${climb}-point climb — D3 and NAIA programs are realistic with continued progress.`
  }
  return 'Every climb counts — focus on quality wins to accelerate from here.'
}

export function deriveJourneyTaglineParts(
  bracket: string,
  projectedUtr: number,
  peerCohort: TrajectoryPoint[],
  graduationAge: number,
  d1Target = D1_MID_MAJOR_TARGET,
): { peerPhrase: string; suffix: string } {
  const peerAtGrad = peerUtrAtGraduation(peerCohort, graduationAge)
  const peerDelta =
    peerAtGrad != null ? projectedUtr - peerAtGrad : null

  let peerPhrase = 'building toward your trajectory'
  if (peerDelta != null) {
    if (peerDelta >= 0.5) peerPhrase = 'tracking ahead of top peers'
    else if (peerDelta >= -0.3) peerPhrase = 'tracking with top peers'
    else if (peerDelta >= -1.5) peerPhrase = 'closing the gap with top peers'
    else peerPhrase = 'below top peers, still climbing'
  }

  const d1Delta = projectedUtr - d1Target
  let goalPhrase = ''
  if (d1Delta >= 0) {
    goalPhrase =
      ' D1 programs at the projected level are realistic targets.'
  } else if (d1Delta >= -1.0) {
    goalPhrase = ' D1 mid-major programs are in range at this pace.'
  } else if (d1Delta >= -2.0) {
    goalPhrase = ' D2 and D3 programs are realistic targets at this pace.'
  } else {
    goalPhrase =
      ' D3 and NAIA programs come into focus with continued progress.'
  }

  return {
    peerPhrase,
    suffix: ` through the ${bracket} bracket.${goalPhrase}`,
  }
}
