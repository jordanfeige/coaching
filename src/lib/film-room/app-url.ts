/** Base URL for server-side callbacks (worker fan-out, cron, etc.). */
export function getAppBaseUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ''
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }
  return 'http://localhost:3000'
}

export function getWorkerSecret(): string {
  const secret = process.env.WORKER_SECRET
  if (!secret) {
    throw new Error('WORKER_SECRET is not configured')
  }
  return secret
}
