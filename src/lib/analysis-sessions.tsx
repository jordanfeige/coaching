/** Sessions visible to players in their portal */
export const PLAYER_VISIBLE_SESSIONS_FILTER =
  'lesson_id.is.null,published_to_player.eq.true'

export function isSessionVisibleToPlayer(session: {
  lesson_id?: string | null
  published_to_player?: boolean | null
}): boolean {
  if (!session.lesson_id) return true
  return Boolean(session.published_to_player)
}

export function SessionReviewBadge({
  coachVerified,
}: {
  coachVerified?: boolean | null
}) {
  if (coachVerified) {
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: 999,
          background: '#E1F5EE',
          border: '0.5px solid rgba(29,158,117,.2)',
          fontSize: 10,
          color: '#0F6E56',
          fontWeight: 600,
          display: 'inline-block',
        }}
      >
        ✓ Coach reviewed
      </span>
    )
  }
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        background: 'hsl(40,20%,97%)',
        border: '0.5px solid hsl(30,10%,88%)',
        fontSize: 10,
        color: 'hsl(220,10%,55%)',
        display: 'inline-block',
      }}
    >
      AI only
    </span>
  )
}

export function coachReviewIssuesFromSession(
  fullResult: { areas_to_improve?: unknown[] } | null | undefined,
): Array<{
  area: string
  severity: 'critical' | 'moderate' | 'minor'
  explanation: string
  drill?: string
}> {
  const raw = fullResult?.areas_to_improve || []
  return raw.map(item => {
    const i = (typeof item === 'string' ? { area: item } : item) as {
      area?: string
      severity?: string
      explanation?: string
      what_i_see?: string
      drill?: string
    }
    const severity = (i.severity || 'moderate').toLowerCase()
    const normalized: 'critical' | 'moderate' | 'minor' =
      severity === 'critical' || severity === 'minor' ? severity : 'moderate'
    return {
      area: i.area || 'Technique issue',
      severity: normalized,
      explanation: i.explanation || i.what_i_see || '',
      drill: i.drill,
    }
  })
}
