import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'

export type MatchStatus =
  | 'uploading'
  | 'chunking'
  | 'chunks_ready'
  | 'analyzing_first'
  | 'ready'
  | 'failed'

export type ChunkAnalysisStatus =
  | 'not_analyzed'
  | 'analyzing'
  | 'analyzed'
  | 'failed'

export type FilmRoomChunk = {
  id: string
  sequence_number: number
  start_seconds: number
  end_seconds: number
  duration_seconds: number
  analysis_status: ChunkAnalysisStatus
  analysis_error: string | null
  analysis_result: MatchAnalysisV2 | null
  thumbnail_url: string | null
  thumbnail_storage_path: string | null
}

export type FilmRoomMatchSummary = {
  id: string
  status: MatchStatus
  status_error: string | null
  opponent_name: string | null
  match_context: string | null
  match_date: string | null
  raw_video_duration_seconds: number | null
  created_at: string
  chunk_count: number
  analyzed_count: number
  thumbnail_url: string | null
}

export type FilmRoomMatchDetail = FilmRoomMatchSummary & {
  tap_x_percent: number | null
  tap_y_percent: number | null
  match_chunks: FilmRoomChunk[]
  /** Signed URL when raw upload still exists; otherwise use chunk playback. */
  raw_video_url?: string | null
}
