export function formatSegmentTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDurationLong(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || totalSeconds <= 0) return '—'
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function formatMatchDate(
  matchDate: string | null | undefined,
  fallbackIso?: string | null,
): string {
  if (matchDate) {
    return new Date(`${matchDate}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  if (fallbackIso) {
    return new Date(fallbackIso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
  return ''
}
