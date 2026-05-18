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

  let score = 100
  const areas = Array.isArray(result.areas_to_improve) ? result.areas_to_improve : []
  areas.forEach(issue => {
    const severity = issueSeverity(issue)
    if (severity === 'critical') score -= 15
    else if (severity === 'moderate') score -= 7
    else if (severity === 'minor') score -= 3
  })

  const strengths = Array.isArray(result.strengths) ? result.strengths : []
  score += strengths.length * 5
  if (result.confidence === 'high') score += 3
  if (result.confidence === 'low') score -= 5
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
