type AnalysisIssue = {
  area?: string
  severity?: string
}

type AnalysisStrength = {
  area?: string
}

type AnalysisResult = {
  areas_to_improve?: Array<AnalysisIssue | string>
  strengths?: Array<AnalysisStrength | string>
  confidence?: string
}

function asAnalysisResult(value: unknown): AnalysisResult | null {
  return value && typeof value === 'object' ? value as AnalysisResult : null
}

function areaText(value: AnalysisIssue | AnalysisStrength | string) {
  if (typeof value === 'string') return value
  return value.area || ''
}

function issueSeverity(issue: AnalysisIssue | string) {
  return typeof issue === 'string' ? 'moderate' : issue.severity
}

export function calculateScore(analysis: unknown): number {
  const result = asAnalysisResult(analysis)
  if (!result) return 0

  const areas = Array.isArray(result.areas_to_improve) ? result.areas_to_improve : []
  const strengths = Array.isArray(result.strengths) ? result.strengths : []

  // Start at 60 — score is earned not assumed
  let score = 60

  // Issues subtract
  areas.forEach(issue => {
    const severity = issueSeverity(issue)
    if (severity === 'critical') score -= 12
    else if (severity === 'moderate') score -= 6
    else if (severity === 'minor') score -= 2
  })

  // Strengths add — capped at +20 so they cannot cancel out real issues
  score += Math.min(strengths.length * 4, 20)

  // Rating bonus from AI overall assessment
  const ratingBonus: Record<string, number> = {
    elite: 25,
    advanced: 18,
    intermediate: 10,
    developing: 4,
    beginner: 0,
  }
  const rating = (result as any).overall_rating?.toLowerCase() || 'developing'
  score += ratingBonus[rating] || 0

  // Confidence adjustment
  if (result.confidence === 'high') score += 3
  if (result.confidence === 'low') score -= 8

  // Safety caps — 0 issues means AI failed not perfect technique
  if (areas.length === 0) score = Math.min(score, 65)
  if (areas.length === 1) score = Math.min(score, 78)

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function extractCheckpointScores(analysis: unknown, sport: string): Record<string, number> {
  const result = asAnalysisResult(analysis)
  const checkpoints: Record<string, number> = {}
  const sportCheckpoints: Record<string, string[]> = {
    tennis: ['Grip', 'Ready Position', 'Unit Turn', 'Takeback', 'Swing Path', 'Contact Point', 'Follow Through', 'Footwork', 'Head Position', 'Recovery'],
    golf: ['Address', 'Grip', 'Takeaway', 'Backswing Plane', 'Shoulder Turn', 'Hip Resistance', 'Transition', 'Lag', 'Impact', 'Follow Through'],
    baseball: ['Stance', 'Load', 'Stride', 'Hip Rotation', 'Bat Path', 'Contact Point', 'Extension', 'Follow Through'],
    basketball: ['Stance', 'Shot Pocket', 'Elbow', 'Guide Hand', 'Leg Drive', 'Release', 'Wrist Snap'],
    pickleball: ['Ready Position', 'Serve', 'Dinking', 'Volleys', 'Third Shot', 'Drives', 'Footwork', 'Positioning'],
  }
  const points = sportCheckpoints[sport] || sportCheckpoints.tennis
  const issues = Array.isArray(result?.areas_to_improve) ? result.areas_to_improve : []
  const strengths = Array.isArray(result?.strengths) ? result.strengths : []

  points.forEach(cp => {
    let cpScore = 75
    const checkpoint = cp.toLowerCase()
    const issue = issues.find(item => {
      const area = areaText(item).toLowerCase()
      return Boolean(area && (area.includes(checkpoint) || checkpoint.includes(area)))
    })
    const strength = strengths.find(item => {
      const area = areaText(item).toLowerCase()
      return Boolean(area && (area.includes(checkpoint) || checkpoint.includes(area)))
    })

    if (issue) {
      const severity = issueSeverity(issue)
      if (severity === 'critical') cpScore = 30
      else if (severity === 'moderate') cpScore = 55
      else cpScore = 70
    } else if (strength) {
      cpScore = 90
    }

    checkpoints[cp] = cpScore
  })

  return checkpoints
}
