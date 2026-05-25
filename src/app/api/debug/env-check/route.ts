export const dynamic = 'force-dynamic'

export async function GET() {
  const gcpKey = process.env.GCP_SERVICE_ACCOUNT_KEY
  let gcpInfo: Record<string, unknown> = {
    has_gcp_key: !!gcpKey,
    gcp_key_length: gcpKey?.length || 0,
  }

  if (gcpKey) {
    try {
      const parsed = JSON.parse(gcpKey) as {
        client_email?: string
        private_key_id?: string
        private_key?: string
      }
      gcpInfo = {
        ...gcpInfo,
        gcp_client_email: parsed.client_email,
        gcp_private_key_id: parsed.private_key_id,
        gcp_key_fingerprint: parsed.private_key_id ?? null,
        gcp_private_key_starts_with: parsed.private_key?.substring(0, 30),
        gcp_private_key_ends_with: parsed.private_key?.substring(
          (parsed.private_key?.length ?? 0) - 30,
        ),
        gcp_private_key_length: parsed.private_key?.length || 0,
      }
    } catch (e: unknown) {
      gcpInfo.parse_error = e instanceof Error ? e.message : 'Parse failed'
    }
  }

  return Response.json({
    has_worker_secret: !!process.env.WORKER_SECRET,
    ...gcpInfo,
    vercel_env: process.env.VERCEL_ENV,
  })
}
