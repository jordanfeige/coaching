/** Phase-based evidence (v2.3+), with fallback to legacy MM:SS timestamps. */
export function itemEvidence(item: {
  evidence?: string[]
  timestamps?: string[]
}): string[] {
  if (item.evidence?.length) return item.evidence
  return item.timestamps ?? []
}

export function keyMomentPhase(moment: {
  phase?: string
  timestamp?: string
}): string {
  const phase = moment.phase?.trim()
  if (phase) return phase
  return moment.timestamp?.trim() ?? ''
}
