/** In-memory handoff for video files between Reels → /player/reels/new (File cannot live in sessionStorage). */
let pendingVideoFile: File | null = null
let pendingShotType: string | null = null
let pendingTitle: string | null = null

export function setPendingReelVideoFile(file: File | null) {
  pendingVideoFile = file
}

export function setPendingReelShotType(shotType: string | null) {
  pendingShotType = shotType
}

export function takePendingReelVideoFile(): File | null {
  const file = pendingVideoFile
  pendingVideoFile = null
  return file
}

export function takePendingReelShotType(): string | null {
  const shot = pendingShotType
  pendingShotType = null
  return shot
}

export function takePendingReelTitle(): string | null {
  const title = pendingTitle
  pendingTitle = null
  return title
}
