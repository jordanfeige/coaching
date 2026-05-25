import type { ChunkAnalysisStatus, MatchStatus } from '@/lib/film-room/types'

export type UploadPipelineStep =
  | 'uploading'
  | 'chunking'
  | 'analyzing'
  | 'ready'
  | 'failed'

export function deriveUploadPipelineStep(
  status: MatchStatus,
  options?: {
    uploadComplete?: boolean
    firstChunkStatus?: ChunkAnalysisStatus | null
  },
): UploadPipelineStep {
  if (status === 'failed') return 'failed'
  if (status === 'ready') return 'ready'

  if (status === 'analyzing_first') return 'analyzing'

  if (status === 'chunks_ready') {
    if (options?.firstChunkStatus === 'analyzed') return 'ready'
    return 'analyzing'
  }

  if (status === 'chunking') return 'chunking'

  if (status === 'uploading') {
    return options?.uploadComplete ? 'chunking' : 'uploading'
  }

  return options?.uploadComplete ? 'chunking' : 'uploading'
}
