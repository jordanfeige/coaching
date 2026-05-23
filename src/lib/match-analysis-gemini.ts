import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai'
import { FileState, GoogleAIFileManager } from '@google/generative-ai/server'
import crypto from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { buildMatchAnalysisPrompt } from '@/lib/match-analysis-prompt'
import {
  buildUserContextBlock,
  dataUrlToBase64,
  MATCH_ANALYSIS_SYSTEM_PROMPT,
} from '@/lib/match-analysis/system-prompt'
import { MATCH_ANALYSIS_RESPONSE_SCHEMA } from '@/lib/match-analysis/response-schema'
import {
  GeminiFileProcessingError,
  geminiFileFailureHint,
} from '@/lib/match-analysis/gemini-file-errors'
import type { PlayerIdentificationInput } from '@/lib/match-analysis/types'
import { GeminiJsonParseError, parseGeminiJson } from '@/lib/parse-gemini-json'

export { GeminiJsonParseError, GeminiFileProcessingError }

const MATCH_MODEL =
  process.env.MATCH_ANALYSIS_GEMINI_MODEL || 'gemini-2.5-flash'

const INLINE_MAX_BYTES = 20 * 1024 * 1024

function extensionForMimeType(mimeType: string, filename: string) {
  if (mimeType.includes('quicktime')) return 'mov'
  if (mimeType.includes('webm')) return 'webm'
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.mov') return 'mov'
  if (ext === '.webm') return 'webm'
  return 'mp4'
}

function normalizeVideoMimeType(mimeType: string, filename: string): string {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.mov') return 'video/quicktime'
  if (ext === '.webm') return 'video/webm'
  return 'video/mp4'
}

function maxPollAttemptsForBytes(sizeBytes: number): number {
  // Large videos can take several minutes to transcode on Gemini's side
  if (sizeBytes > 800 * 1024 * 1024) return 300
  if (sizeBytes > 400 * 1024 * 1024) return 180
  return 90
}

async function writeBufferToTempFile(
  buffer: Buffer,
  mimeType: string,
  filename: string,
) {
  const filePath = path.join(
    os.tmpdir(),
    `playvia-match-${crypto.randomBytes(8).toString('hex')}.${extensionForMimeType(mimeType, filename)}`,
  )
  await fs.writeFile(filePath, buffer)
  return filePath
}

async function waitForFileActive(
  fileManager: GoogleAIFileManager,
  fileName: string,
  sizeBytes: number,
) {
  let file = await fileManager.getFile(fileName)
  const maxAttempts = maxPollAttemptsForBytes(sizeBytes)
  const pollMs = 2000

  for (let i = 0; file.state === FileState.PROCESSING && i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, pollMs))
    file = await fileManager.getFile(fileName)
    if (i > 0 && i % 10 === 0) {
      console.log(
        `[match-analysis] Gemini file still processing (${((i * pollMs) / 1000).toFixed(0)}s)...`,
      )
    }
  }

  if (file.state === FileState.FAILED) {
    console.error(
      '[match-analysis] Gemini file FAILED:',
      JSON.stringify({
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        error: file.error,
        videoMetadata: file.videoMetadata,
      }),
    )
    throw new GeminiFileProcessingError(file, geminiFileFailureHint(sizeBytes))
  }
  if (file.state !== FileState.ACTIVE) {
    throw new Error(
      `Video is still processing on Gemini after ${((maxAttempts * pollMs) / 1000 / 60).toFixed(0)} minutes. Try again shortly.`,
    )
  }

  return file
}

async function uploadViaFilesApi(
  fileManager: GoogleAIFileManager,
  buffer: Buffer,
  mimeType: string,
  displayName: string,
) {
  const tmpPath = await writeBufferToTempFile(buffer, mimeType, displayName)
  try {
    const uploaded = await fileManager.uploadFile(tmpPath, {
      mimeType,
      displayName,
    })
    const file = await waitForFileActive(
      fileManager,
      uploaded.file.name,
      buffer.length,
    )
    return {
      uri: file.uri,
      mimeType: file.mimeType || mimeType,
      name: file.name,
    }
  } finally {
    await fs.unlink(tmpPath).catch(() => {})
  }
}

export type RunMatchAnalysisInput = {
  buffer: Buffer
  mimeType: string
  filename: string
  opponentName: string
  matchContext: string
  /** v2: tap-to-identify — required on test endpoint */
  playerIdentification?: PlayerIdentificationInput
}

export type RunMatchAnalysisOutput = {
  analysis: unknown
  usageMetadata: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
  model: string
  uploadMethod: 'files_api' | 'inline'
  geminiFileName?: string
  analysisVersion: 'v1' | 'v2'
}

export async function runMatchAnalysis(
  input: RunMatchAnalysisInput,
): Promise<RunMatchAnalysisOutput> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const mimeType = normalizeVideoMimeType(
    input.mimeType || 'video/mp4',
    input.filename,
  )
  const fileManager = new GoogleAIFileManager(apiKey)
  const isV2 = Boolean(input.playerIdentification)

  const useFilesApi = input.buffer.length > INLINE_MAX_BYTES
  let geminiFileName: string | undefined

  const parts: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
    | { fileData: { fileUri: string; mimeType: string } }
  > = []

  try {
    if (isV2 && input.playerIdentification) {
      const frameB64 = dataUrlToBase64(
        input.playerIdentification.referenceFrameDataUrl,
      )
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: frameB64 },
      })
    }

    if (useFilesApi) {
      console.log(
        `[match-analysis] Using Files API (${(input.buffer.length / 1024 / 1024).toFixed(1)}MB)`,
      )
      const uploaded = await uploadViaFilesApi(
        fileManager,
        input.buffer,
        mimeType,
        `match-${input.filename}-${Date.now()}`,
      )
      geminiFileName = uploaded.name
      parts.push({
        fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType },
      })
    } else {
      console.log(
        `[match-analysis] Using inline upload (${(input.buffer.length / 1024 / 1024).toFixed(1)}MB)`,
      )
      parts.push({
        inlineData: {
          mimeType,
          data: input.buffer.toString('base64'),
        },
      })
    }

    if (isV2 && input.playerIdentification) {
      parts.push({
        text: buildUserContextBlock({
          tapXPercent: input.playerIdentification.tapXPercent,
          tapYPercent: input.playerIdentification.tapYPercent,
          frameCapturedAtSeconds:
            input.playerIdentification.frameCapturedAtSeconds,
          opponentName: input.opponentName,
          matchContext: input.matchContext,
          playerDescriptionHint:
            input.playerIdentification.playerDescriptionHint,
        }),
      })
    } else {
      parts.push({
        text: buildMatchAnalysisPrompt({
          opponent_name: input.opponentName,
          match_context: input.matchContext,
        }),
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MATCH_MODEL,
      ...(isV2 ? { systemInstruction: MATCH_ANALYSIS_SYSTEM_PROMPT } : {}),
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: isV2 ? 0.2 : 0.4,
        maxOutputTokens: isV2 ? 16384 : 8192,
        mediaResolution: 'MEDIA_RESOLUTION_LOW',
        ...(isV2 ? { responseSchema: MATCH_ANALYSIS_RESPONSE_SCHEMA } : {}),
      } as GenerationConfig,
    })

    console.log(
      `[match-analysis] Calling ${MATCH_MODEL} (${isV2 ? 'v2 tap-to-identify' : 'v1'})...`,
    )
    const result = await model.generateContent(parts)
    const response = result.response
    const text = response.text()
    const usageMetadata = response.usageMetadata

    let analysis: unknown
    try {
      analysis = parseGeminiJson(text)
    } catch (e) {
      if (e instanceof GeminiJsonParseError) {
        console.error(
          '[match-analysis] JSON parse failed; preview:',
          e.rawPreview.slice(0, 500),
        )
        throw e
      }
      throw e
    }

    return {
      analysis,
      usageMetadata: {
        promptTokenCount: usageMetadata?.promptTokenCount,
        candidatesTokenCount: usageMetadata?.candidatesTokenCount,
        totalTokenCount: usageMetadata?.totalTokenCount,
      },
      model: MATCH_MODEL,
      uploadMethod: useFilesApi ? 'files_api' : 'inline',
      geminiFileName,
      analysisVersion: isV2 ? 'v2' : 'v1',
    }
  } finally {
    if (geminiFileName) {
      await fileManager.deleteFile(geminiFileName).catch(err => {
        console.warn('[match-analysis] Failed to delete Gemini file:', err)
      })
    }
  }
}
