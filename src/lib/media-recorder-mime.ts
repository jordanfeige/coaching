/** Pick a MediaRecorder MIME type supported in this browser. */
export function preferredRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return undefined
}

export function blobTypeForRecording(mimeType?: string): string {
  if (!mimeType) return 'video/webm'
  return mimeType.split(';')[0] || 'video/webm'
}

export function fileExtensionForMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  return 'webm'
}
