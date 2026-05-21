const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** True when beta approval is required before app access (production). */
export function isBetaGateEnabled(hostname?: string | null): boolean {
  if (process.env.PLAYVIA_BETA_GATE === 'false') return false
  if (process.env.PLAYVIA_BETA_GATE === 'true') return true

  const host = (hostname ?? '').split(':')[0].toLowerCase()
  if (LOCAL_HOSTS.has(host) || host.endsWith('.localhost')) return false

  // `next dev` — local testing without approval
  if (process.env.NODE_ENV === 'development') return false

  return true
}

export function defaultBetaStatus(hostname?: string | null): 'approved' | 'pending' {
  return isBetaGateEnabled(hostname) ? 'pending' : 'approved'
}

export function homePathForRole(role: string | null | undefined): string {
  return role === 'coach' ? '/dashboard' : '/player'
}
