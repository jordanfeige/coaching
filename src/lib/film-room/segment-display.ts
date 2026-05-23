import { formatSegmentTime } from '@/lib/film-room/format'
import type { FilmRoomChunk } from '@/lib/film-room/types'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'

export function segmentHumanLabel(
  chunk: Pick<FilmRoomChunk, 'sequence_number' | 'start_seconds' | 'end_seconds'>,
  totalChunks: number,
): string {
  const isFirst = chunk.sequence_number === 0
  const isLast = chunk.sequence_number === totalChunks - 1
  const mins = Math.round((chunk.end_seconds - chunk.start_seconds) / 60)

  if (isFirst && totalChunks === 1) {
    return `Full match · ${formatSegmentTime(chunk.end_seconds)}`
  }
  if (isFirst) {
    return mins > 0 ? `First ${mins} minutes` : `First ${formatSegmentTime(chunk.end_seconds)}`
  }
  if (isLast) {
    const finalMins = Math.max(1, Math.round((chunk.end_seconds - chunk.start_seconds) / 60))
    return `Final ${finalMins} minutes`
  }
  return `${formatSegmentTime(chunk.start_seconds)} – ${formatSegmentTime(chunk.end_seconds)}`
}

export function truncateNarrative(text: string, max = 140): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

export function segmentPillTags(analysis: MatchAnalysisV2 | null): {
  workOn?: { label: string }
  worked?: { label: string }
} {
  if (!analysis) return {}
  const workOn = analysis.work_on_top_three?.[0]
  const worked = analysis.what_worked?.[0]
  const out: { workOn?: { label: string }; worked?: { label: string } } = {}
  if (workOn?.title) {
    const n = analysis.work_on_top_three?.length ?? 1
    out.workOn = { label: `${workOn.title} ×${n}` }
  }
  if (worked?.observation) {
    const n = analysis.what_worked?.length ?? 1
    const short =
      worked.observation.length > 24
        ? `${worked.observation.slice(0, 22)}…`
        : worked.observation
    out.worked = { label: `${short} ×${n}` }
  }
  return out
}

export type ChunkMarker = {
  sequenceNumber: number
  startSeconds: number
  hasWorkOn: boolean
  hasWhatWorked: boolean
}

export function chunkMarkersFromAnalyses(
  chunks: FilmRoomChunk[],
): ChunkMarker[] {
  return chunks.map(c => {
    const a = c.analysis_result
    return {
      sequenceNumber: c.sequence_number,
      startSeconds: c.start_seconds,
      hasWorkOn: (a?.work_on_top_three?.length ?? 0) > 0,
      hasWhatWorked: (a?.what_worked?.length ?? 0) > 0,
    }
  })
}
