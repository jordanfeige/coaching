import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isMatchAnalysisAllowed } from '@/lib/match-analysis-access'
import {
  GeminiFileProcessingError,
  GeminiJsonParseError,
  runMatchAnalysis,
} from '@/lib/match-analysis-gemini'
import { computeEstimatedCostUsd } from '@/lib/match-analysis/types'
import {
  MAX_MATCH_VIDEO_BYTES,
  MAX_MATCH_VIDEO_MB,
} from '@/lib/match-analysis/limits'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 900

function parsePercent(value: FormDataEntryValue | null, field: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error(`Invalid ${field}: must be 0–100`)
  }
  return n
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!isMatchAnalysisAllowed(user)) {
    return NextResponse.json(
      {
        error: 'This endpoint is not enabled for your account',
        hint: 'Set MATCH_ANALYSIS_ALLOWED_USER_IDS to your auth user UUID, or sign in with an admin email.',
        user_id: user.id,
      },
      { status: 403 },
    )
  }

  const formData = await req.formData()
  const videoFile = formData.get('video')
  const opponentName = String(formData.get('opponent_name') ?? '').trim()
  const matchContext = String(formData.get('match_context') ?? '').trim()
  const referenceFrame = formData.get('reference_frame_data_url')
  const tapX = formData.get('tap_x_percent')
  const tapY = formData.get('tap_y_percent')
  const frameAt = formData.get('frame_captured_at_seconds')
  const playerHint = String(formData.get('player_description_hint') ?? '').trim()

  if (!(videoFile instanceof File)) {
    return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
  }

  if (typeof referenceFrame !== 'string' || !referenceFrame.startsWith('data:image')) {
    return NextResponse.json(
      {
        error: 'Player identification required',
        hint: 'Use tap-to-identify on the test page before analyzing.',
      },
      { status: 400 },
    )
  }

  let tapXPercent: number
  let tapYPercent: number
  let frameCapturedAtSeconds: number
  try {
    tapXPercent = parsePercent(tapX, 'tap_x_percent')
    tapYPercent = parsePercent(tapY, 'tap_y_percent')
    frameCapturedAtSeconds = Number(frameAt)
    if (!Number.isFinite(frameCapturedAtSeconds) || frameCapturedAtSeconds < 0) {
      throw new Error('Invalid frame_captured_at_seconds')
    }
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Invalid player identification fields',
        message: e instanceof Error ? e.message : 'Bad request',
      },
      { status: 400 },
    )
  }

  if (videoFile.size > MAX_MATCH_VIDEO_BYTES) {
    return NextResponse.json(
      {
        error: `Video exceeds ${MAX_MATCH_VIDEO_MB}MB limit`,
        size_mb: (videoFile.size / 1024 / 1024).toFixed(1),
      },
      { status: 400 },
    )
  }

  const mimeType = videoFile.type || 'video/mp4'
  const sizeMb = (videoFile.size / 1024 / 1024).toFixed(1)

  console.log(`[match-analysis] Starting v2 analysis for ${user.id}`)
  console.log(
    `[match-analysis] Video: ${videoFile.name}, size: ${sizeMb}MB, type: ${mimeType}`,
  )
  console.log(
    `[match-analysis] Tap: (${tapXPercent.toFixed(1)}%, ${tapYPercent.toFixed(1)}%) @ ${frameCapturedAtSeconds}s`,
  )

  try {
    const buffer = Buffer.from(await videoFile.arrayBuffer())

    const { analysis, usageMetadata, model, uploadMethod, analysisVersion } =
      await runMatchAnalysis({
        buffer,
        mimeType,
        filename: videoFile.name,
        opponentName: opponentName || 'opponent',
        matchContext: matchContext || 'tennis match',
        playerIdentification: {
          referenceFrameDataUrl: referenceFrame,
          tapXPercent,
          tapYPercent,
          frameCapturedAtSeconds,
          playerDescriptionHint: playerHint || undefined,
        },
      })

    const elapsedMs = Date.now() - startTime
    const elapsedMin = elapsedMs / 60000
    const estimatedCostUSD = computeEstimatedCostUsd(usageMetadata)

    console.log(`[match-analysis] Complete in ${elapsedMin.toFixed(1)} min`)
    console.log(
      `[match-analysis] Tokens — prompt: ${usageMetadata.promptTokenCount}, completion: ${usageMetadata.candidatesTokenCount}, total: ${usageMetadata.totalTokenCount}`,
    )
    console.log(`[match-analysis] Estimated cost: $${estimatedCostUSD.toFixed(4)}`)

    return NextResponse.json({
      success: true,
      analysis,
      meta: {
        analysis_version: analysisVersion,
        video_filename: videoFile.name,
        video_size_mb: parseFloat(sizeMb),
        elapsed_ms: elapsedMs,
        elapsed_minutes: parseFloat(elapsedMin.toFixed(2)),
        token_usage: usageMetadata,
        estimated_cost_usd: parseFloat(estimatedCostUSD.toFixed(4)),
        model,
        upload_method: uploadMethod,
        player_tap: {
          tap_x_percent: tapXPercent,
          tap_y_percent: tapYPercent,
          frame_captured_at_seconds: frameCapturedAtSeconds,
        },
      },
    })
  } catch (err: unknown) {
    const elapsedMs = Date.now() - startTime

    if (err instanceof GeminiFileProcessingError) {
      console.error('[match-analysis] Gemini file processing failed')
      return NextResponse.json(
        {
          error: 'Video processing failed on Gemini',
          message: err.message,
          hint: err.hint,
          gemini_file: err.geminiFile,
          elapsed_ms: elapsedMs,
        },
        { status: 500 },
      )
    }

    if (err instanceof GeminiJsonParseError) {
      console.error('[match-analysis] Malformed JSON from Gemini')
      return NextResponse.json(
        {
          error: 'Gemini returned malformed JSON',
          message: err.message,
          raw_response_preview: err.rawPreview,
          elapsed_ms: elapsedMs,
          hint: 'Re-run the analysis; jsonrepair was applied but parsing still failed.',
        },
        { status: 500 },
      )
    }

    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[match-analysis] Error:', err)

    return NextResponse.json(
      {
        error: 'Analysis failed',
        message,
        elapsed_ms: elapsedMs,
      },
      { status: 500 },
    )
  }
}
