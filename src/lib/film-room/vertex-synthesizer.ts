import { getVertexAI } from '@/lib/vertex-ai/client'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { parseGeminiJson } from '@/lib/parse-gemini-json'
import {
  MATCH_SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
} from '@/lib/match-analysis/synthesis-prompt'
import { MATCH_SYNTHESIS_RESPONSE_SCHEMA } from '@/lib/match-analysis/synthesis-schema'
import type { MatchSynthesisV1 } from '@/lib/match-analysis/synthesis-types'

const MATCH_MODEL = process.env.MATCH_ANALYSIS_GEMINI_MODEL || 'gemini-2.5-flash'

export function chunksIncludedMatch(
  stored: number[] | null | undefined,
  current: number[],
): boolean {
  if (!stored?.length || stored.length !== current.length) return false
  const a = [...stored].sort((x, y) => x - y)
  const b = [...current].sort((x, y) => x - y)
  return a.every((v, i) => v === b[i])
}

export async function synthesizeMatch(matchId: string): Promise<{
  synthesis: MatchSynthesisV1
  chunksIncluded: number[]
  cacheHit: boolean
  synthesisId: string
}> {
  const admin = createSupabaseAdminClient()

  const { data: chunks, error: chunkErr } = await admin
    .from('match_chunks')
    .select('id, sequence_number, start_seconds, end_seconds, analysis_result, analysis_status')
    .eq('match_id', matchId)
    .eq('analysis_status', 'analyzed')
    .order('sequence_number', { ascending: true })

  if (chunkErr) throw new Error(chunkErr.message)

  const analyzed = chunks ?? []
  if (analyzed.length < 2) {
    throw new Error('Not enough analyzed segments')
  }

  const chunksIncluded = analyzed.map(c => c.sequence_number)

  const { data: existing } = await admin
    .from('match_syntheses')
    .select('id, chunks_included, synthesis_result')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (
    existing &&
    chunksIncludedMatch(existing.chunks_included as number[], chunksIncluded)
  ) {
    return {
      synthesis: existing.synthesis_result as MatchSynthesisV1,
      chunksIncluded,
      cacheHit: true,
      synthesisId: existing.id,
    }
  }

  const { count: totalChunkCount } = await admin
    .from('match_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId)

  const model = getVertexAI().getGenerativeModel({
    model: MATCH_MODEL,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: MATCH_SYNTHESIS_RESPONSE_SCHEMA as unknown as object,
      maxOutputTokens: 8192,
    },
  })

  const userPrompt = buildSynthesisUserPrompt(
    analyzed.map(c => ({
      sequence_number: c.sequence_number,
      start_seconds: c.start_seconds,
      end_seconds: c.end_seconds,
      analysis_result: c.analysis_result,
    })),
    totalChunkCount ?? analyzed.length,
  )

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${MATCH_SYNTHESIS_SYSTEM_PROMPT}\n\n${userPrompt}` }],
      },
    ],
  })

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty synthesis response from Vertex AI')

  const synthesis = parseGeminiJson<MatchSynthesisV1>(text)

  const { data: inserted, error: insertErr } = await admin
    .from('match_syntheses')
    .insert({
      match_id: matchId,
      chunks_included: chunksIncluded,
      synthesis_result: synthesis,
      synthesis_version: 'v1',
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message ?? 'Failed to save synthesis')
  }

  return {
    synthesis,
    chunksIncluded,
    cacheHit: false,
    synthesisId: inserted.id,
  }
}
