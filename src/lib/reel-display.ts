const MAX_REEL_TITLE_LENGTH = 80

export function normalizeReelTitle(value: string): string {
  return value.trim().slice(0, MAX_REEL_TITLE_LENGTH)
}

export function capitalizeShotType(shotType: string): string {
  const s = shotType.trim()
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Default label before the player customizes it. */
export function defaultReelTitle(shotType?: string | null): string {
  const shot = shotType ? capitalizeShotType(shotType) : 'Reel'
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${shot} · ${date}`
}

/** Primary label for cards, lists, and Ask Via. */
export function formatReelDisplayTitle(
  title: string | null | undefined,
  shotType?: string | null,
  sport?: string | null,
): string {
  const trimmed = title?.trim()
  if (trimmed) return trimmed
  if (shotType?.trim()) return capitalizeShotType(shotType)
  if (sport?.trim()) {
    return sport.charAt(0).toUpperCase() + sport.slice(1)
  }
  return 'Reel'
}
