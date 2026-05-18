import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'videos'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function extensionFromName(fileName?: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  return ext || 'mp4'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action || 'create'
    const supabaseAdmin = adminClient()

    if (action === 'read') {
      const path = typeof body.path === 'string' ? body.path : ''
      if (!path.startsWith('free-analysis/')) {
        return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
      }
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 20)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ signedUrl: data.signedUrl })
    }

    if (action === 'delete') {
      const path = typeof body.path === 'string' ? body.path : ''
      if (path.startsWith('free-analysis/')) {
        await supabaseAdmin.storage.from(BUCKET).remove([path])
      }
      return NextResponse.json({ success: true })
    }

    const fileName = typeof body.fileName === 'string' ? body.fileName : 'analysis-video.mp4'
    const contentType = typeof body.contentType === 'string' ? body.contentType : 'video/mp4'
    const ext = extensionFromName(fileName)
    const path = `free-analysis/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      path,
      token: data.token,
      contentType,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create upload URL' },
      { status: 500 }
    )
  }
}
