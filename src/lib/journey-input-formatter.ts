/**
 * Human-readable copy for journey_score_inputs and journey_score_events.
 * Read-only — does not change sync or stored data shapes.
 */

export type JourneyInputRow = {
  category: string
  input_key: string
  value_numeric: number | null
  value_text: string | null
  unit: string | null
  source: string
  verified: boolean
  captured_at: string
}

export type JourneyEventRow = {
  event_type: string
  category: string | null
  label: string
  before_value: string | null
  after_value: string | null
  delta_score: number | null
  created_at: string
}

function parseJsonText(text: string | null): Record<string, unknown> | null {
  if (!text || !text.trim().startsWith('{')) return null
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

function formatAreaList(areas: unknown): string {
  if (!Array.isArray(areas) || areas.length === 0) return ''
  const formatted = areas.map(a => formatArea(String(a)))
  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`
  return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`
}

function formatArea(area: string): string {
  return area.replace(/_/g, ' ').toLowerCase()
}

/**
 * Returns the human-readable value to display for an input row.
 */
export function formatInputValue(input: JourneyInputRow): string {
  const md = parseJsonText(input.value_text)
  const v =
    input.value_numeric != null ? Number(input.value_numeric) : null

  if (input.category === 'coachability') {
    switch (input.input_key) {
      case 'drill_pts_90d': {
        const assigned = md?.assigned ?? md?.drills_assigned_90d
        const completed = md?.completed ?? md?.drills_completed_90d
        const rate = md?.rate ?? md?.drill_completion_rate
        if (assigned != null && completed != null) {
          const a = Number(assigned)
          const c = Number(completed)
          if (a === 0) return 'No drills assigned yet'
          const pct = rate != null ? Math.round(Number(rate) * 100) : Math.round((c / a) * 100)
          return `${c} of ${a} drills completed (${pct}%)`
        }
        return v != null ? `${v} of 4 pts` : '—'
      }

      case 'improvement_pts_90d': {
        const method = (md?.method ?? md?.improvement_method) as string | undefined
        if (method === 'issues_fixed') {
          const fixed = Array.isArray(md?.fixed_areas)
            ? md!.fixed_areas!.length
            : Array.isArray(md?.issues_fixed)
              ? md!.issues_fixed!.length
              : 0
          const areas = md?.fixed_areas ?? md?.issues_fixed
          if (fixed === 0) return 'No issues fixed across recent analyses'
          if (fixed === 1) return `1 issue fixed: ${formatAreaList(areas)}`
          return `${fixed} issues fixed: ${formatAreaList(areas)}`
        }
        if (method === 'score_velocity') {
          const vel = Number(md?.velocity ?? md?.score_velocity ?? 0)
          if (vel > 5) return `Scores trending up (+${vel} pts over 90 days)`
          if (vel > 0) return `Scores steady (+${vel} over 90 days)`
          if (vel === 0) return 'Scores flat over 90 days'
          if (vel > -5) return `Scores slightly down (${vel} over 90 days)`
          return `Scores trending down (${vel} pts over 90 days)`
        }
        if (
          method === 'insufficient_data' ||
          method === 'none' ||
          method === 'insufficient'
        ) {
          return 'Not enough analyses yet to measure improvement'
        }
        return v != null ? `${v} of 5 pts` : '—'
      }

      case 'lesson_pts_90d': {
        const fromMd = md?.lessons_completed_90d ?? md?.completedLessons
        const fromText =
          input.value_text && !input.value_text.trim().startsWith('{')
            ? Number(input.value_text)
            : NaN
        const count = fromMd != null ? Number(fromMd) : fromText
        if (!Number.isNaN(count)) {
          if (count === 0) return 'No completed lessons in last 90 days'
          if (count === 1) return '1 lesson completed in last 90 days'
          return `${count} lessons completed in last 90 days`
        }
        return v != null ? `${v} of 3 pts` : '—'
      }

      case 'reel_pts_90d': {
        const fromMd = md?.reels_analyzed_90d ?? md?.analyzedReels
        const fromText =
          input.value_text && !input.value_text.trim().startsWith('{')
            ? Number(input.value_text)
            : NaN
        const count = fromMd != null ? Number(fromMd) : fromText
        if (!Number.isNaN(count)) {
          if (count === 0) return 'No reels analyzed in last 90 days'
          if (count === 1) return '1 reel analyzed in last 90 days'
          return `${count} reels analyzed in last 90 days`
        }
        return v != null ? `${v} of 3 pts` : '—'
      }

      case 'technique_velocity_90d':
        return v != null ? `${v} pts technique velocity` : '—'
      case 'issue_resolution_avg_sessions':
        return v != null ? `${v} sessions avg to resolve issues` : '—'
      case 'sessions_90d':
        return v != null ? `${v} sessions in last 90 days` : '—'
    }
  }

  if (input.category === 'exposure') {
    switch (input.input_key) {
      case 'match_count_12mo':
        return v ? `${v} matches in last 12 months` : 'No matches recorded'
      case 'quality_wins_12mo':
        return v ? `${v} quality wins (vs UTR ≥ yours)` : 'No quality wins yet'
      case 'national_events_12mo':
        return v ? `${v} national/sectional events` : 'No national events yet'
      case 'win_pct_12mo':
        return v != null ? `${Math.round(v * 100)}% win rate` : '—'
      case 'tournament_count_12mo':
      case 'sanctioned_tournaments_12mo':
        return v ? `${v} tournaments in last 12 months` : 'No tournaments yet'
      case 'verified_reels_count':
        return v ? `${v} verified match reels` : 'No verified reels yet'
    }
  }

  if (input.category === 'tennis') {
    if (input.input_key === 'utr_rating') {
      return v != null ? `UTR ${v.toFixed(2)}` : '—'
    }
  }

  if (input.category === 'academics') {
    switch (input.input_key) {
      case 'gpa':
        return v != null ? `GPA ${v.toFixed(2)}` : '—'
      case 'sat':
        return v != null ? `SAT ${v}` : '—'
      case 'act':
        return v != null ? `ACT ${v}` : '—'
      case 'transcript_uploaded':
        return v ? 'Transcript on file' : 'No transcript uploaded'
    }
  }

  if (md && Object.keys(md).length > 0) {
    return v != null ? `${v} pts` : '—'
  }

  if (input.value_text && !input.value_text.trim().startsWith('{')) {
    const n = Number(input.value_text)
    if (!Number.isNaN(n) && input.unit === 'pts') return `${n} pts`
    return input.value_text
  }

  if (v == null) return '—'
  if (input.unit === 'utr_points') return v.toFixed(2)
  if (input.unit === 'gpa') return v.toFixed(1)
  return String(v)
}

export function formatInputLabel(input: JourneyInputRow): string {
  const labels: Record<string, string> = {
    'coachability:drill_pts_90d': 'Drill completion (90d)',
    'coachability:improvement_pts_90d': 'Improvement (90d)',
    'coachability:lesson_pts_90d': 'Lesson attendance (90d)',
    'coachability:reel_pts_90d': 'Reel velocity (90d)',
    'coachability:technique_velocity_90d': 'Technique velocity (90d)',
    'coachability:issue_resolution_avg_sessions': 'Issue resolution speed',
    'coachability:sessions_90d': 'Film responsiveness (90d)',
    'exposure:match_count_12mo': 'Matches played (12mo)',
    'exposure:quality_wins_12mo': 'Quality wins (12mo)',
    'exposure:national_events_12mo': 'National/sectional events (12mo)',
    'exposure:win_pct_12mo': 'Win rate (12mo)',
    'exposure:tournament_count_12mo': 'Tournaments (12mo)',
    'exposure:sanctioned_tournaments_12mo': 'Sanctioned tournaments (12mo)',
    'exposure:verified_reels_count': 'Verified match reels',
    'tennis:utr_rating': 'UTR rating',
    'academics:gpa': 'GPA',
    'academics:sat': 'SAT score',
    'academics:act': 'ACT score',
    'academics:transcript_uploaded': 'Transcript',
  }

  const key = `${input.category}:${input.input_key}`
  return labels[key] ?? `${input.category} · ${input.input_key.replace(/_/g, ' ')}`
}

export function formatInputSource(input: JourneyInputRow): string {
  const sourceLabel: Record<string, string> = {
    coachability_sync: 'Auto-computed',
    utr_api: 'UTR API',
    drill_completions: 'From your drills',
    lessons: 'From your lessons',
    reels: 'From your reels',
    self_reported: 'Self-reported',
    verified: 'Verified',
    playvia: 'Playvia',
    video_analysis: 'Video analysis',
    college_board: 'College Board',
    usta_manual: 'USTA',
  }

  const label = sourceLabel[input.source] ?? input.source ?? 'Unknown'
  const dateStr = new Date(input.captured_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return `${label} · ${dateStr}`
}

export function formatEventDescription(event: JourneyEventRow): {
  label: string
  change: string
  delta: string
} {
  const delta =
    event.delta_score != null
      ? `${event.delta_score > 0 ? '+' : ''}${event.delta_score}`
      : '—'

  if (event.event_type === 'tier_changed') {
    return {
      label: event.label || 'Tier updated',
      change: event.after_value
        ? `Now ${event.after_value}`
        : event.before_value
          ? `From ${event.before_value}`
          : '',
      delta,
    }
  }

  if (event.event_type === 'input_verified') {
    return {
      label: event.label || 'Input verified',
      change: 'Marked as verified',
      delta,
    }
  }

  if (event.label?.startsWith('Coachability sync:')) {
    const pts = event.label.replace('Coachability sync:', '').trim()
    return {
      label: 'Coachability updated',
      change: `Engagement signals refreshed (${pts})`,
      delta,
    }
  }

  const keyMatch = event.label?.match(/^([\w_]+):\s*(.+)$/)
  if (keyMatch) {
    const [, inputKey, rest] = keyMatch
    const humanKey = formatInputLabel({
      category: event.category ?? '',
      input_key: inputKey,
      value_numeric: null,
      value_text: null,
      unit: null,
      source: '',
      verified: false,
      captured_at: event.created_at,
    })

    const beforeMd = parseJsonText(event.before_value)
    const afterMd = parseJsonText(event.after_value)

    if (beforeMd || afterMd) {
      const beforeHuman = formatInputValue({
        category: event.category ?? 'coachability',
        input_key: inputKey,
        value_numeric: tryParseNum(event.before_value),
        value_text: event.before_value,
        unit: 'pts',
        source: '',
        verified: false,
        captured_at: event.created_at,
      })
      const afterHuman = formatInputValue({
        category: event.category ?? 'coachability',
        input_key: inputKey,
        value_numeric: tryParseNum(event.after_value),
        value_text: event.after_value,
        unit: 'pts',
        source: '',
        verified: false,
        captured_at: event.created_at,
      })
      return {
        label: humanKey,
        change: `${beforeHuman} → ${afterHuman}`,
        delta,
      }
    }

    return {
      label: humanKey,
      change: rest.replace(/→/g, '→').trim(),
      delta,
    }
  }

  if (event.label?.includes(' added:')) {
    const [keyPart] = event.label.split(' added:')
    const humanKey = formatInputLabel({
      category: event.category ?? '',
      input_key: keyPart.trim(),
      value_numeric: null,
      value_text: null,
      unit: null,
      source: '',
      verified: false,
      captured_at: event.created_at,
    })
    const afterHuman = formatInputValue({
      category: event.category ?? '',
      input_key: keyPart.trim(),
      value_numeric: tryParseNum(event.after_value),
      value_text: event.after_value,
      unit: null,
      source: '',
      verified: false,
      captured_at: event.created_at,
    })
    return {
      label: humanKey,
      change: `Set to ${afterHuman}`,
      delta,
    }
  }

  return {
    label: event.label || 'Score update',
    change: humanizeRawValue(event.after_value ?? event.before_value ?? ''),
    delta,
  }
}

function tryParseNum(s: string | null): number | null {
  if (s == null) return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

function humanizeRawValue(raw: string): string {
  const md = parseJsonText(raw)
  if (!md) {
    const n = Number(raw)
    if (!Number.isNaN(n) && raw.trim() !== '') return `${n} pts`
    return raw || '—'
  }
  if (md.method === 'score_velocity' && md.velocity != null) {
    const vel = Number(md.velocity)
    return vel >= 0
      ? `Scores up ${vel} pts over 90 days`
      : `Scores down ${vel} pts over 90 days`
  }
  return 'Updated'
}
