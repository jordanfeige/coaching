import { NextRequest, NextResponse } from 'next/server'
import { assignLibraryDrillToPlayer } from '@/lib/assign-library-drill'
import type { CustomDrillPayload } from '@/lib/drills-library'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return NextResponse.json({ error: 'No player' }, { status: 404 })
  }

  const body = (await req.json()) as {
    libraryDrillId?: string
    customDrillData?: CustomDrillPayload
  }

  const result = await assignLibraryDrillToPlayer(supabase, playerId, {
    libraryDrillId: body.libraryDrillId,
    customDrillData: body.customDrillData,
  })

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: 400 },
    )
  }

  return NextResponse.json({
    success: true,
    drillId: result.drillId,
    title: result.title,
    libraryDrillId: result.libraryDrillId,
  })
}
