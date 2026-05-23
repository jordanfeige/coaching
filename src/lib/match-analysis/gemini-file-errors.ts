import type { FileMetadataResponse } from '@google/generative-ai/server'

export class GeminiFileProcessingError extends Error {
  readonly geminiFile: Pick<
    FileMetadataResponse,
    'name' | 'state' | 'mimeType' | 'sizeBytes' | 'error' | 'videoMetadata'
  >
  readonly hint: string

  constructor(file: FileMetadataResponse, hint: string) {
    const apiMessage = file.error?.message?.trim()
    const sizeMb = file.sizeBytes
      ? (Number(file.sizeBytes) / 1024 / 1024).toFixed(1)
      : 'unknown'
    const duration = file.videoMetadata?.videoDuration

    const parts = [
      'Gemini could not process this video file.',
      apiMessage ? `API: ${apiMessage}` : null,
      `State: ${file.state}, size: ${sizeMb}MB, mime: ${file.mimeType || 'unknown'}`,
      duration ? `Duration metadata: ${duration}` : null,
    ].filter(Boolean)

    super(parts.join(' '))
    this.name = 'GeminiFileProcessingError'
    this.geminiFile = {
      name: file.name,
      state: file.state,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      error: file.error,
      videoMetadata: file.videoMetadata,
    }
    this.hint = hint
  }
}

export function geminiFileFailureHint(sizeBytes: number): string {
  const sizeMb = sizeBytes / 1024 / 1024
  const hints = [
    'Re-export the video as H.264 MP4 (not HEVC/H.265). QuickTime → Export or HandBrake preset "Fast 1080p30".',
    'Keep length under ~60 minutes (with audio) or ~45 minutes if Gemini still fails.',
  ]
  if (sizeMb > 700) {
    hints.unshift(
      `This file is ${sizeMb.toFixed(0)}MB — very large for processing. Try a 720p export or lower bitrate (target under 500MB if possible).`,
    )
  }
  hints.push('Then re-upload on the match analysis test page.')
  return hints.join(' ')
}
