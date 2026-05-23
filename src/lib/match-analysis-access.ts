import { ADMIN_EMAILS } from '@/lib/admin'

/** Comma-separated auth user UUIDs in MATCH_ANALYSIS_ALLOWED_USER_IDS */
export function isMatchAnalysisAllowed(user: {
  id: string
  email?: string | null
}): boolean {
  const fromEnv = process.env.MATCH_ANALYSIS_ALLOWED_USER_IDS
  if (fromEnv) {
    const ids = fromEnv
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    if (ids.includes(user.id)) return true
  }

  const email = user.email?.toLowerCase()
  if (email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
    return true
  }

  return false
}
