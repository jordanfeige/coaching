export type RecruitingOutlookFactor = {
  label: string
  value: string
  impact?: 'positive' | 'neutral' | 'negative' | 'watch'
}

export type RecruitingOutlookAction = {
  title: string
  priority?: 'critical' | 'important' | 'nice_to_have'
  detail?: string
}

export type RecruitingOutlook = {
  snapshot: string
  confidence?: 'low' | 'medium' | 'high'
  confidence_note?: string
  factors: RecruitingOutlookFactor[]
  actions: RecruitingOutlookAction[]
}

export type ViaSuggestedSchool = {
  school: string
  division: string
  type: 'reach' | 'target' | 'likely'
  why?: string
  wtn_needed?: number
  conference?: string
  location?: string
}

export function parseRecruitingOutlook(
  projection: unknown,
): RecruitingOutlook | null {
  if (!projection || typeof projection !== 'object') return null
  const p = projection as Record<string, unknown>

  if (p.outlook && typeof p.outlook === 'object') {
    const o = p.outlook as Record<string, unknown>
    const factors = Array.isArray(o.factors)
      ? (o.factors as RecruitingOutlookFactor[])
      : []
    const actions = Array.isArray(o.actions)
      ? (o.actions as RecruitingOutlookAction[])
      : []
    const snapshot = String(o.snapshot || '').trim()
    if (!snapshot && factors.length === 0 && actions.length === 0) return null
    const nestedConf = o.confidence
    const level =
      typeof nestedConf === 'object' && nestedConf !== null
        ? ((nestedConf as { level?: string }).level as RecruitingOutlook['confidence'])
        : (nestedConf as RecruitingOutlook['confidence'])
    const note =
      typeof nestedConf === 'object' && nestedConf !== null
        ? String((nestedConf as { reason?: string }).reason || o.confidence_note || '')
        : o.confidence_note
          ? String(o.confidence_note)
          : undefined

    return {
      snapshot,
      confidence: level,
      confidence_note: note,
      factors,
      actions,
    }
  }

  const confObj = p.confidence
  const parsedConfidence =
    typeof confObj === 'object' && confObj !== null
      ? ((confObj as { level?: string }).level as RecruitingOutlook['confidence'])
      : (p.confidence as RecruitingOutlook['confidence'])
  const parsedConfidenceNote =
    typeof confObj === 'object' && confObj !== null
      ? String((confObj as { reason?: string }).reason || p.confidence_note || '')
      : p.confidence_note
        ? String(p.confidence_note)
        : undefined

  const legacySummary = String(
    p.overall_assessment || p.via_family_summary || '',
  ).trim()
  if (!legacySummary) return null

  const legacyActions = Array.isArray(p.what_needs_to_happen)
    ? (p.what_needs_to_happen as Array<Record<string, string>>).map(
        item => ({
          title: item.action || String(item),
          priority: item.priority as RecruitingOutlookAction['priority'],
          detail: item.why,
        }),
      )
    : []

  return {
    snapshot: legacySummary,
    confidence: parsedConfidence,
    confidence_note: parsedConfidenceNote,
    factors: [],
    actions: legacyActions,
  }
}

export function parseSuggestedSchools(
  raw: unknown,
): ViaSuggestedSchool[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map(item => {
        const s = item as Record<string, unknown>
        const type = String(s.type || 'target').toLowerCase()
        return {
          school: String(s.school || s.name || ''),
          division: String(s.division || '—'),
          type: (['reach', 'target', 'likely'].includes(type)
            ? type
            : 'target') as ViaSuggestedSchool['type'],
          why: s.why ? String(s.why) : undefined,
          wtn_needed:
            typeof s.wtn_needed === 'number' ? s.wtn_needed : undefined,
          conference: s.conference ? String(s.conference) : undefined,
          location: s.location
            ? String(s.location)
            : s.region
              ? String(s.region)
              : undefined,
        }
      })
      .filter(s => s.school)
  }
  return []
}
