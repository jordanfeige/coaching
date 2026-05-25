/** Origin for the incoming request (proxy-aware; use for same-deployment worker fan-out). */
export function getRequestOrigin(req: Request): string {
  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost ?? req.headers.get('host')
  if (host) {
    const proto =
      req.headers.get('x-forwarded-proto') ??
      (host.includes('localhost') ? 'http' : 'https')
    return `${proto}://${host}`.replace(/\/$/, '')
  }
  return new URL(req.url).origin
}

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
