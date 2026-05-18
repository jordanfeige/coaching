'use client'

const SKILL_LEVELS = ['beginner', 'developing', 'intermediate', 'advanced', 'elite']

function confidenceTitle(confidence: string) {
  if (confidence === 'high') {
    return 'High confidence - video quality and angle were clear enough for precise analysis'
  }
  if (confidence === 'medium') {
    return 'Medium confidence - some aspects of technique were partially obscured'
  }
  return 'Low confidence - video quality or angle limited the analysis accuracy'
}

function confidenceLabel(confidence: string) {
  if (confidence === 'high') return 'High confidence'
  if (confidence === 'medium') return 'Medium confidence'
  return 'Low confidence - retake from side-on angle'
}

function confidenceIcon(confidence: string) {
  if (confidence === 'high') return '✓'
  if (confidence === 'medium') return '~'
  return '!'
}

function confidenceColors(confidence: string) {
  if (confidence === 'high') {
    return {
      background: 'hsl(168,62%,95%)',
      color: 'hsl(168,62%,36%)',
      border: 'hsl(168,62%,70%)',
    }
  }
  if (confidence === 'medium') {
    return {
      background: 'hsl(38,92%,95%)',
      color: 'hsl(38,92%,35%)',
      border: 'hsl(38,92%,70%)',
    }
  }
  return {
    background: '#FEE2E2',
    color: '#DC2626',
    border: '#FCA5A5',
  }
}

export default function AnalysisQualityBadges({
  rating,
  confidence,
}: {
  rating?: string | null
  confidence?: string | null
}) {
  const normalizedRating = rating?.toLowerCase()
  const normalizedConfidence = confidence?.toLowerCase()
  const colors = normalizedConfidence ? confidenceColors(normalizedConfidence) : null
  const showAccuracyTip =
    normalizedConfidence === 'low' || normalizedConfidence === 'medium'

  if (!normalizedRating && !normalizedConfidence) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {normalizedRating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                color: 'hsl(220,10%,55%)',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Skill level:
            </span>
            {SKILL_LEVELS.map(level => {
              const isActive = level === normalizedRating
              return (
                <span
                  key={level}
                  style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontWeight: isActive ? 700 : 400,
                    fontFamily: 'Arial, sans-serif',
                    background: isActive ? 'hsl(168,62%,36%)' : 'hsl(30,10%,93%)',
                    color: isActive ? 'white' : 'hsl(220,10%,65%)',
                    border: isActive ? 'none' : '1px solid hsl(30,10%,88%)',
                    textTransform: 'capitalize',
                  }}
                >
                  {level}
                </span>
              )
            })}
          </div>
        )}

        {normalizedConfidence && colors && (
          <div
            title={confidenceTitle(normalizedConfidence)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'Arial, sans-serif',
              cursor: 'help',
              background: colors.background,
              color: colors.color,
              border: `1px solid ${colors.border}`,
            }}
          >
            <span>{confidenceIcon(normalizedConfidence)}</span>
            {confidenceLabel(normalizedConfidence)}
          </div>
        )}
      </div>

      {showAccuracyTip && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'hsl(38,92%,95%)',
            border: '1px solid hsl(38,92%,70%)',
            fontSize: 12,
            color: 'hsl(38,92%,35%)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          💡 For better accuracy: film from the side at waist height, ensure full body
          is visible, and use good lighting.
        </div>
      )}
    </div>
  )
}
