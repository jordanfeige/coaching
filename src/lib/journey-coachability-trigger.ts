/**
 * Fire-and-forget Coachability sync (server-side only — uses CRON_SECRET).
 */
export function triggerCoachabilitySync(playerId: string): void {
  const secret = process.env.CRON_SECRET
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  if (!secret || !base || !playerId) return

  void fetch(`${base.replace(/\/$/, '')}/api/journey/coachability/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerId }),
  }).catch(err => {
    console.error('[coachability-sync] trigger failed:', err)
  })
}
