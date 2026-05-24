export type StartFilmRoomProcessingPayload = {
  matchId: string
  referenceFrameDataUrl: string
  tapXPercent: number
  tapYPercent: number
  frameCapturedAtSeconds: number
  playerDescriptionHint?: string
}

/**
 * Kick off chunking/analysis on the server (POST only).
 * Does not await completion — poll GET /api/film-room/match/:matchId for status.
 */
export function startFilmRoomProcessing(
  payload: StartFilmRoomProcessingPayload,
  signal?: AbortSignal,
): void {
  void fetch('/api/film-room/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  }).catch(err => {
    if (err instanceof Error && err.name === 'AbortError') return
    console.error('[film-room] Process request failed:', err)
  })
}
