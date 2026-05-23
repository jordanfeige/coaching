import { createRequire } from 'node:module'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
import { promisify } from 'util'
import { exec as execCallback } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const nodeRequire = createRequire(import.meta.url)

ffmpeg.setFfmpegPath(ffmpegInstaller.path)
const exec = promisify(execCallback)
const FFMPEG_PATH = ffmpegInstaller.path

/** Resolved at runtime so Turbopack does not bundle the platform binary. */
function getFfprobePath(): string {
  return nodeRequire('@ffprobe-installer/ffprobe').path as string
}

export type ChunkResult = {
  sequenceNumber: number
  startSeconds: number
  endSeconds: number
  durationSeconds: number
  localPath: string
  sizeBytes: number
  thumbnailLocalPath: string
}

export type ProbedVideo = {
  durationSeconds: number
  codec: string
  width: number
  height: number
  bitrate: number
}

export async function probeVideo(inputPath: string): Promise<ProbedVideo> {
  const { stdout } = await exec(
    `"${getFfprobePath()}" -v error -select_streams v:0 -show_entries stream=codec_name,width,height,bit_rate,duration -of json "${inputPath}"`,
  )
  const data = JSON.parse(stdout) as {
    streams: Array<{
      duration: string
      codec_name: string
      width: number
      height: number
      bit_rate?: string
    }>
  }
  const stream = data.streams[0]
  return {
    durationSeconds: Math.floor(parseFloat(stream.duration)),
    codec: stream.codec_name,
    width: stream.width,
    height: stream.height,
    bitrate: parseInt(stream.bit_rate || '0', 10),
  }
}

/**
 * Re-encode AND chunk in a single ffmpeg pass.
 * Always re-encodes to H.264 720p — never uses -c copy.
 */
export async function chunkVideo(
  inputPath: string,
  chunkDurationSeconds: number = 600,
): Promise<ChunkResult[]> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playvia-chunk-'))
  const probed = await probeVideo(inputPath)
  const totalDuration = probed.durationSeconds

  const chunkPattern = path.join(tempDir, 'chunk-%03d.mp4')
  const ffmpegCmd = [
    `"${FFMPEG_PATH}"`,
    `-i "${inputPath}"`,
    `-c:v libx264 -crf 26 -preset fast`,
    `-vf "scale=-2:720"`,
    `-c:a aac -b:a 96k`,
    `-movflags +faststart`,
    `-f segment -segment_time ${chunkDurationSeconds} -reset_timestamps 1`,
    `"${chunkPattern}"`,
  ].join(' ')

  await exec(ffmpegCmd, { maxBuffer: 1024 * 1024 * 200 })

  const files = await fs.readdir(tempDir)
  const chunkFiles = files
    .filter(f => f.startsWith('chunk-') && f.endsWith('.mp4'))
    .sort()

  const chunks: ChunkResult[] = []
  for (let i = 0; i < chunkFiles.length; i++) {
    const chunkPath = path.join(tempDir, chunkFiles[i])
    const stat = await fs.stat(chunkPath)
    const startSeconds = i * chunkDurationSeconds
    const endSeconds = Math.min((i + 1) * chunkDurationSeconds, totalDuration)
    const durationSeconds = endSeconds - startSeconds

    const thumbnailPath = path.join(
      tempDir,
      `thumb-${i.toString().padStart(3, '0')}.jpg`,
    )
    const midSeconds = startSeconds + Math.floor(durationSeconds / 2)
    const thumbCmd = [
      `"${FFMPEG_PATH}"`,
      `-ss ${midSeconds}`,
      `-i "${inputPath}"`,
      `-frames:v 1`,
      `-vf "scale=320:-2"`,
      `-q:v 5`,
      `"${thumbnailPath}"`,
    ].join(' ')
    await exec(thumbCmd)

    chunks.push({
      sequenceNumber: i,
      startSeconds,
      endSeconds,
      durationSeconds,
      localPath: chunkPath,
      sizeBytes: stat.size,
      thumbnailLocalPath: thumbnailPath,
    })
  }

  return chunks
}

export async function cleanupChunkTempDir(chunks: ChunkResult[]): Promise<void> {
  if (chunks.length === 0) return
  const tempDir = path.dirname(chunks[0].localPath)
  await fs.rm(tempDir, { recursive: true, force: true })
}
