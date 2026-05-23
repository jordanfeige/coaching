import { getVertexAI } from '@/lib/vertex-ai/client'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  MATCH_ANALYSIS_SYSTEM_PROMPT,
  buildUserContextBlock,
} from '@/lib/match-analysis/system-prompt'
import { MATCH_ANALYSIS_RESPONSE_SCHEMA } from '@/lib/match-analysis/response-schema'
import { parseGeminiJson } from '@/lib/parse-gemini-json'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'

const MAX_ATTEMPTS = 3
const MATCH_MODEL = process.env.MATCH_ANALYSIS_GEMINI_MODEL || 'gemini-2.5-flash'

type MatchRow = {
  opponent_name: string | null
  match_context: string | null
  tap_x_percent: number | null
  tap_y_percent: number | null
  frame_captured_at_seconds: number | null
  player_description_hint: string | null
  reference_frame_storage_path: string | null
}

type ChunkRow = {
  id: string
  sequence_number: number
  start_seconds: number
  end_seconds: number
  gcs_uri: string
  matches: MatchRow
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Analyze a single chunk using Vertex AI Gemini.
 * Retries with exponential backoff (2s, 4s).
 */
export async function analyzeChunk(chunkId: string): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient()

  await supabaseAdmin
    .from('match_chunks')
    .update({ analysis_status: 'analyzing', analysis_error: null })
    .eq('id', chunkId)

  const { data: chunk, error } = await supabaseAdmin
    .from('match_chunks')
    .select('id, sequence_number, start_seconds, end_seconds, gcs_uri, matches!inner(*)')
    .eq('id', chunkId)
    .single()

  if (error || !chunk) {
    throw new Error('Chunk not found')
  }

  const row = chunk as unknown as ChunkRow
  const match = row.matches

  if (!match.reference_frame_storage_path) {
    throw new Error('Match has no reference frame')
  }

  const { data: frameBlob, error: frameErr } = await supabaseAdmin.storage
    .from('match-videos')
    .download(match.reference_frame_storage_path)

  if (frameErr || !frameBlob) {
    throw new Error('Could not load reference frame')
  }

  const frameBase64 = Buffer.from(await frameBlob.arrayBuffer()).toString('base64')

  const userContext = buildUserContextBlock({
    tapXPercent: Number(match.tap_x_percent ?? 50),
    tapYPercent: Number(match.tap_y_percent ?? 50),
    frameCapturedAtSeconds: Number(match.frame_captured_at_seconds ?? 30),
    opponentName: match.opponent_name || 'opponent',
    matchContext: match.match_context || 'unspecified',
    playerDescriptionHint: match.player_description_hint ?? undefined,
  })

  const segmentContext = [
    'SEGMENT CONTEXT:',
    `This is segment ${row.sequence_number + 1} of the match, covering ${formatTime(row.start_seconds)} to ${formatTime(row.end_seconds)} from the full match.`,
    'Analyze ONLY this segment. Match-level patterns will be synthesized separately.',
    'Use phase-based evidence (early/mid/late in THIS clip, which starts at 0:00). Do NOT emit MM:SS timestamps.',
  ].join(' ')

  const model = getVertexAI().getGenerativeModel({
    model: MATCH_MODEL,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      // Vertex SDK Schema type differs from @google/generative-ai Schema — same JSON shape
      responseSchema: MATCH_ANALYSIS_RESPONSE_SCHEMA as unknown as object,
      maxOutputTokens: 8192,
    },
  })

  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  fileUri: row.gcs_uri,
                  mimeType: 'video/mp4',
                },
              },
              {
                inlineData: {
                  data: frameBase64,
                  mimeType: 'image/jpeg',
                },
              },
              {
                text: `${MATCH_ANALYSIS_SYSTEM_PROMPT}\n\n${userContext}\n\n${segmentContext}`,
              },
            ],
          },
        ],
      })

      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('Empty response from Vertex AI')
      }

      const analysis = parseGeminiJson<MatchAnalysisV2>(text)

      await supabaseAdmin
        .from('match_chunks')
        .update({
          analysis_status: 'analyzed',
          analysis_result: analysis,
          analysis_version: 'v2.3',
          analyzed_at: new Date().toISOString(),
          analysis_error: null,
        })
        .eq('id', chunkId)

      return
    } catch (err) {
      lastError = err
      const message = err instanceof Error ? err.message : String(err)
      console.error(
        `[vertex-analyzer] Attempt ${attempt}/${MAX_ATTEMPTS} failed for chunk ${chunkId}:`,
        message,
      )
      if (attempt < MAX_ATTEMPTS) {
        await sleep(2000 * Math.pow(2, attempt - 1))
      }
    }
  }

  const errMessage =
    lastError instanceof Error
      ? lastError.message
      : 'Analysis failed after retries'

  await supabaseAdmin
    .from('match_chunks')
    .update({
      analysis_status: 'failed',
      analysis_error: errMessage,
    })
    .eq('id', chunkId)

  throw lastError
}
