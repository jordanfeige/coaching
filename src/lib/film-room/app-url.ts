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
  // Bracket access: read at runtime (not inlined empty at build when var was missing during `next build`).
  const secret = process.env['WORKER_SECRET']?.trim()
  if (!secret) {
    throw new Error(
      'WORKER_SECRET is not configured. Add it to .env.local and restart `npm run dev`, or set it in Vercel for Production and Preview, then redeploy.',
    )
  }
  return secret
}
