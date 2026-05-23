import type { MatchStatus } from '@/lib/film-room/types'

/** Hide failed uploads and matches that never received a video file. */
export function isMatchVisibleInList(row: {
  status: MatchStatus | string
  raw_video_storage_path?: string | null
}): boolean {
  if (row.status === 'failed') return false
  if (row.status === 'uploading' && !row.raw_video_storage_path?.trim()) {
    return false
  }
  return true
}
