export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    has_worker_secret: !!process.env.WORKER_SECRET,
    worker_secret_length: process.env.WORKER_SECRET?.length || 0,
    has_app_url: !!process.env.NEXT_PUBLIC_APP_URL,
    app_url_value: process.env.NEXT_PUBLIC_APP_URL || null,
    has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_gcp_key: !!process.env.GCP_SERVICE_ACCOUNT_KEY,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    all_env_keys_starting_with_w: Object.keys(process.env)
      .filter(k => k.toUpperCase().startsWith('W'))
      .sort(),
  })
}
