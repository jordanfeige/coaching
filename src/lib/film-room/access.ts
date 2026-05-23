import { isMatchAnalysisAllowed } from '@/lib/match-analysis-access'

/** Built-in allowlist for Film Room during beta (plus env overrides). */
const DEFAULT_FILM_ROOM_EMAILS = [
  'jordan.feige@gmail.com',
  'jordanfeige+test4@gmail.com',
]

function allowedFilmRoomEmails(): Set<string> {
  const emails = new Set(
    DEFAULT_FILM_ROOM_EMAILS.map(e => e.toLowerCase()),
  )
  const fromEnv = process.env.FILM_ROOM_ALLOWED_EMAILS
  if (fromEnv) {
    for (const part of fromEnv.split(',')) {
      const e = part.trim().toLowerCase()
      if (e) emails.add(e)
    }
  }
  const jordanEmail = process.env.JORDAN_EMAIL?.trim().toLowerCase()
  if (jordanEmail) emails.add(jordanEmail)
  return emails
}

/** Jordan's Supabase test accounts: jordanfeige+test1@gmail.com, etc. */
function isJordanGmailTestAccount(email: string): boolean {
  return /^jordanfeige\+[^@]+@gmail\.com$/i.test(email.trim())
}

/** Film Room UI + pipeline (beta allowlist). */
export function isFilmRoomEnabled(user: {
  id: string
  email?: string | null
}): boolean {
  const email = user.email?.trim().toLowerCase()
  if (email) {
    if (allowedFilmRoomEmails().has(email)) return true
    if (isJordanGmailTestAccount(email)) return true
  }
  return isMatchAnalysisAllowed(user)
}
