import type { ExtractedVideoFrame } from '@/lib/video-frames'

function compactFrameForAi(frame: ExtractedVideoFrame) {
  return {
    index: frame.index,
    timestamp: frame.timestamp,
    mediaType: frame.mediaType,
    base64: frame.base64,
  }
}

function compactLocalAnalysis(localAnalysis: Record<string, unknown>) {
  const {
    frame_previews: _framePreviews,
    compare_frame_previews: _compareFramePreviews,
    local_pose_summary: _localPoseSummary,
    ...analysis
  } = localAnalysis

  return analysis
}

function friendlyAiCoachError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/429|quota|rate limit|Too Many Requests|RESOURCE_EXHAUSTED/i.test(message)) {
    return 'AI coach feedback is temporarily unavailable because the Gemini quota was reached. The local pose analysis was saved, and AI feedback should work again after quota resets or billing is enabled.'
  }
  if (/413|payload too large|request entity too large|body exceeded/i.test(message)) {
    return 'AI coach feedback could not run because the selected frames were too large. The local pose analysis was saved. Try selecting 2-3 frames for the AI coach explanation.'
  }
  if (/GEMINI_API_KEY|not configured/i.test(message)) {
    return 'AI coach feedback is not configured yet. The local pose analysis was saved.'
  }
  if (/model.*not found|not found.*model|404/i.test(message)) {
    return 'AI coach feedback could not run because the configured Gemini model was not available for this API key. The local pose analysis was saved.'
  }
  if (/timed out|timeout/i.test(message)) {
    return 'AI coach feedback took too long, so the local pose analysis was saved instead. Try fewer selected frames or retry later.'
  }
  return 'AI coach feedback was unavailable, so the local pose analysis was saved instead.'
}

export async function enhanceAnalysisWithCoachAi({
  frames,
  localAnalysis,
  playerName,
  sport,
  focusNote,
}: {
  frames: ExtractedVideoFrame[]
  localAnalysis: Record<string, unknown>
  playerName?: string | null
  sport?: string | null
  focusNote?: string
}): Promise<Record<string, unknown>> {
  try {
    const response = await fetch('/api/video-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'coach_explanation',
        frames: frames.map(compactFrameForAi),
        localAnalysis: compactLocalAnalysis(localAnalysis),
        playerName,
        sport,
        focusNote,
      }),
    })

    const text = await response.text()
    let payload: Record<string, unknown> = {}
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = { error: text.slice(0, 500) }
    }

    if (!response.ok) {
      throw new Error(
        typeof payload.error === 'string'
          ? `HTTP ${response.status}: ${payload.error}`
          : `HTTP ${response.status}: AI coach explanation failed`
      )
    }

    return {
      ...localAnalysis,
      ...payload,
      annotations: localAnalysis.annotations,
      frame_previews: localAnalysis.frame_previews,
      compare_frame_previews: localAnalysis.compare_frame_previews,
      selected_frame_indices: localAnalysis.selected_frame_indices,
      coach_selected_focus: localAnalysis.coach_selected_focus,
      local_pose_summary: {
        observations: localAnalysis.observations,
        technique_notes: localAnalysis.technique_notes,
        areas_to_improve: localAnalysis.areas_to_improve,
      },
      analysis_method: 'browser_pose_detection_plus_ai_coach',
      ai_coach_enhanced: true,
    }
  } catch (error) {
    return {
      ...localAnalysis,
      ai_coach_enhanced: false,
      ai_coach_error: friendlyAiCoachError(error),
    }
  }
}
