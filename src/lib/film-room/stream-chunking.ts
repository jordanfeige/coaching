import { createRequire } from 'node:module'
import { spawn } from 'child_process'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { pipeline } from 'stream/promises'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { getChunksBucket } from '@/lib/vertex-ai/client'
import type { ProbedVideo } from '@/lib/video/chunker'

const execFileP = promisify(execFile)
const nodeRequire = createRequire(import.meta.url)
const FFMPEG_PATH = ffmpegInstaller.path

function getFfprobePath(): string {
  return nodeRequire('@ffprobe-installer/ffprobe').path as string
}

function parseFfprobeJson(stdout: string): ProbedVideo {
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
  if (!stream) {
    throw new Error('ffprobe: no video stream found')
  }
  const durationSeconds = Math.floor(parseFloat(stream.duration))
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('ffprobe: invalid duration')
  }
  return {
    durationSeconds,
    codec: stream.codec_name,
    width: stream.width,
    height: stream.height,
    bitrate: parseInt(stream.bit_rate || '0', 10),
  }
}

/** Probe duration/codec from a remote URL without downloading the full file. */
export async function probeVideoUrl(sourceUrl: string): Promise<ProbedVideo> {
  const { stdout } = await execFileP(getFfprobePath(), [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=codec_name,width,height,bit_rate,duration',
    '-of',
    'json',
    sourceUrl,
  ])
  return parseFfprobeJson(stdout)
}

/** Extract a single JPEG thumbnail via ffmpeg stdout (small buffer only). */
export async function extractThumbnailFromUrl(
  sourceUrl: string,
  atSeconds: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = []
    const proc = spawn(
      FFMPEG_PATH,
      [
        '-ss',
        String(atSeconds),
        '-i',
        sourceUrl,
        '-frames:v',
        '1',
        '-vf',
        'scale=320:-2',
        '-q:v',
        '5',
        '-f',
        'image2pipe',
        '-vcodec',
        'mjpeg',
        'pipe:1',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )

    const stderr: string[] = []
    proc.stdout.on('data', (chunk: Buffer) => parts.push(chunk))
    proc.stderr.on('data', (d: Buffer) => stderr.push(d.toString()))

    proc.on('error', reject)
    proc.on('close', code => {
      if (code === 0) {
        resolve(Buffer.concat(parts))
      } else {
        reject(
          new Error(
            `ffmpeg thumbnail failed (${code}): ${stderr.join('').slice(-500)}`,
          ),
        )
      }
    })
  })
}

export type StreamedChunkResult = {
  sequenceNumber: number
  startSeconds: number
  endSeconds: number
  durationSeconds: number
  gcsPath: string
  sizeBytes: number
  thumbnailBuffer: Buffer
}

async function deleteGcsObject(gcsPath: string): Promise<void> {
  try {
    await getChunksBucket().file(gcsPath).delete({ ignoreNotFound: true })
  } catch {
    /* ignore */
  }
}

/**
 * Encode one segment from sourceUrl and stream stdout directly into GCS (no /tmp file).
 */
export async function streamChunkToGcs(
  sourceUrl: string,
  gcsPath: string,
  startSeconds: number,
  durationSeconds: number,
): Promise<{ sizeBytes: number }> {
  const file = getChunksBucket().file(gcsPath)
  const uploadStream = file.createWriteStream({
    contentType: 'video/mp4',
    resumable: false,
  })

  const proc = spawn(
    FFMPEG_PATH,
    [
      '-ss',
      String(startSeconds),
      '-i',
      sourceUrl,
      '-t',
      String(durationSeconds),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '26',
      '-vf',
      'scale=-2:720',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+frag_keyframe+empty_moov',
      '-f',
      'mp4',
      'pipe:1',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  const stderr: string[] = []
  proc.stderr.on('data', (d: Buffer) => {
    const line = d.toString()
    stderr.push(line)
    if (line.trim()) console.log('[ffmpeg]', line.trim())
  })

  let exitCode: number | null = null
  const exitPromise = new Promise<void>((resolve, reject) => {
    proc.on('error', reject)
    proc.on('close', code => {
      exitCode = code
      resolve()
    })
  })

  try {
    await Promise.all([exitPromise, pipeline(proc.stdout, uploadStream)])

    if (exitCode !== 0) {
      throw new Error(
        `ffmpeg exited with code ${exitCode}: ${stderr.join('').slice(-800)}`,
      )
    }

    const [meta] = await file.getMetadata()
    const sizeBytes = Number(meta.size ?? 0)
    if (!sizeBytes) {
      throw new Error('GCS chunk upload completed with zero size')
    }
    return { sizeBytes }
  } catch (err) {
    await deleteGcsObject(gcsPath)
    if (!proc.killed) {
      proc.kill('SIGKILL')
    }
    uploadStream.destroy()
    throw err
  }
}

async function streamChunkWithRetry(
  sourceUrl: string,
  gcsPath: string,
  startSeconds: number,
  durationSeconds: number,
  retries = 2,
): Promise<{ sizeBytes: number }> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await streamChunkToGcs(
        sourceUrl,
        gcsPath,
        startSeconds,
        durationSeconds,
      )
    } catch (err) {
      lastError = err
      await deleteGcsObject(gcsPath)
      if (attempt < retries) {
        console.log(
          `[film-room/stream] Chunk ${gcsPath} attempt ${attempt + 1} failed, retrying…`,
        )
      }
    }
  }
  throw lastError
}

function chunkGcsPath(matchId: string, sequenceNumber: number): string {
  return `matches/${matchId}/chunks/chunk-${sequenceNumber.toString().padStart(3, '0')}.mp4`
}

/**
 * Process all segments sequentially: ffmpeg → GCS pipe per chunk, thumbnail in memory only.
 */
export async function streamMatchIntoChunks(
  matchId: string,
  sourceUrl: string,
  chunkDurationSeconds = 600,
): Promise<{ probed: ProbedVideo; chunks: StreamedChunkResult[] }> {
  const probed = await probeVideoUrl(sourceUrl)
  const totalDuration = probed.durationSeconds
  const numChunks = Math.max(1, Math.ceil(totalDuration / chunkDurationSeconds))
  const results: StreamedChunkResult[] = []

  for (let i = 0; i < numChunks; i++) {
    const startSeconds = i * chunkDurationSeconds
    const durationSeconds = Math.min(
      chunkDurationSeconds,
      totalDuration - startSeconds,
    )
    const endSeconds = startSeconds + durationSeconds
    const gcsPath = chunkGcsPath(matchId, i)

    console.log(
      `[film-room/stream] Chunk ${i + 1}/${numChunks} (${startSeconds}s–${endSeconds}s)`,
    )

    const { sizeBytes } = await streamChunkWithRetry(
      sourceUrl,
      gcsPath,
      startSeconds,
      durationSeconds,
    )

    const midSeconds = startSeconds + Math.floor(durationSeconds / 2)
    const thumbnailBuffer = await extractThumbnailFromUrl(sourceUrl, midSeconds)

    results.push({
      sequenceNumber: i,
      startSeconds,
      endSeconds,
      durationSeconds,
      gcsPath,
      sizeBytes,
      thumbnailBuffer,
    })
  }

  return { probed, chunks: results }
}
