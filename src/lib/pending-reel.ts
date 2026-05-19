/** In-memory handoff for video files between Reels → /player/reels/new (File cannot live in sessionStorage). */
let pendingVideoFile: File | null = null

export function setPendingReelVideoFile(file: File | null) {
  pendingVideoFile = file
}

export function takePendingReelVideoFile(): File | null {
  const file = pendingVideoFile
  pendingVideoFile = null
  return file
}
