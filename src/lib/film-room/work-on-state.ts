import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isMissingTableError(message: string): boolean {
  return (
    message.includes('match_chunk_work_on_state') &&
    (message.includes('schema cache') ||
      message.includes('does not exist') ||
      message.includes('Could not find the table'))
  )
}

export async function archiveWorkOnItem(
  matchChunkId: string,
  workOnRank: 1 | 2 | 3,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('match_chunk_work_on_state').upsert(
    {
      match_chunk_id: matchChunkId,
      work_on_rank: workOnRank,
      archived_at: new Date().toISOString(),
      restored_at: null,
    },
    { onConflict: 'match_chunk_id,work_on_rank' },
  )

  if (error) {
    console.error('[film-room/archive]', error)
    if (isMissingTableError(error.message)) {
      return {
        ok: false,
        status: 503,
        error:
          'Archive is not set up yet. Apply migration 202607031200_film_room_phase3.sql (or 202607041200_film_room_archive_delete_fix.sql) in Supabase.',
      }
    }
    return { ok: false, status: 500, error: error.message }
  }

  return { ok: true }
}

export async function restoreWorkOnItem(
  matchChunkId: string,
  workOnRank: 1 | 2 | 3,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('match_chunk_work_on_state')
    .update({
      archived_at: null,
      restored_at: new Date().toISOString(),
    })
    .eq('match_chunk_id', matchChunkId)
    .eq('work_on_rank', workOnRank)

  if (error) {
    console.error('[film-room/restore]', error)
    if (isMissingTableError(error.message)) {
      return {
        ok: false,
        status: 503,
        error:
          'Restore is not set up yet. Apply migration 202607031200_film_room_phase3.sql (or 202607041200_film_room_archive_delete_fix.sql) in Supabase.',
      }
    }
    return { ok: false, status: 500, error: error.message }
  }

  return { ok: true }
}
