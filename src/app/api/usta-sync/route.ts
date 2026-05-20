import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function extractUaid(input: string): string {
  if (!input) return ''
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  const decoded = decodeURIComponent(decodeURIComponent(trimmed))
  const match = decoded.match(/uaid[=:](\d+)/)
  if (match?.[1]) return match[1]
  const numMatch = trimmed.match(/(\d{8,12})/)
  return numMatch?.[1] || trimmed
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { uaid: rawUaid, profileId } = await req.json()
  const uaid = extractUaid(rawUaid)

  if (!uaid || !/^\d+$/.test(uaid)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid USTA player ID. Paste the full profile URL or just the number.',
      },
      { status: 400 },
    )
  }

  if (profileId) {
    await supabase
      .from('recruiting_profiles')
      .update({
        usta_uaid: uaid,
        usta_profile_url:
          'https://www.usta.com/en/home/play/player-search/profile.html' +
          `#uaid=${uaid}&tab=about`,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', profileId)
  }

  return NextResponse.json({
    success: true,
    uaid,
    message:
      'USTA profile linked. Enter WTN and rankings manually below.',
  })
}
