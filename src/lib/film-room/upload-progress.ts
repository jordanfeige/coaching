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

/** Short list/card label for match processing state. */
export function matchProcessingPillLabel(status: MatchStatus): string {
  switch (status) {
    case 'uploading':
      return 'Uploading…'
    case 'chunking':
      return 'Splitting…'
    case 'chunks_ready':
    case 'analyzing_first':
      return 'Analyzing…'
    case 'failed':
      return 'Failed'
    case 'ready':
      return 'Ready'
    default:
      return status
  }
}

export function isMatchStillProcessing(status: MatchStatus): boolean {
  return (
    status === 'uploading' ||
    status === 'chunking' ||
    status === 'chunks_ready' ||
    status === 'analyzing_first'
  )
}
