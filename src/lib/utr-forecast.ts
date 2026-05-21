/**
 * UTR trajectory / age helpers. Uses players.birth_date when set;
 * falls back to grad_year from recruiting profile, then age 12.
 */

export type PlayerTrajectoryPoint = {
  age: number
  utr: number
  label?: string
}

export type PlayerTrajectory = {
  currentAge: number
  graduationAge: number
  gradYear: number | null
  currentUtr: number | null
  forecastUtrAtGraduation: number | null
  points: PlayerTrajectoryPoint[]
  ageSource: 'birth_date' | 'class_year_estimate' | 'default'
}

/** Whole-year age as of `asOf` (defaults to today). */
export function computeAge(
  birthDate: string,
  asOf: Date = new Date(),
): number {
  const b = new Date(`${birthDate}T12:00:00`)
  if (Number.isNaN(b.getTime())) return 12
  let age = asOf.getFullYear() - b.getFullYear()
  const monthDelta = asOf.getMonth() - b.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < b.getDate())) {
    age -= 1
  }
  return Math.max(1, age)
}

/** Age on a specific calendar date. */
export function computeAgeAt(birthDate: string, atDate: Date): number {
  return computeAge(birthDate, atDate)
}

function estimateAgeFromGradYear(gradYear: number, asOf = new Date()): number {
  return Math.max(8, 17 - (gradYear - asOf.getFullYear()))
}

function parseGradYear(classYear: string | number | null | undefined): number | null {
  if (classYear == null) return null
  if (typeof classYear === 'number' && Number.isFinite(classYear)) return classYear
  const s = String(classYear)
  if (s.includes('2030')) return 2030
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function isValidBirthDate(iso: string): boolean {
  const d = new Date(`${iso}T12:00:00`)
  const now = new Date()
  const min = new Date('1970-01-01T12:00:00')
  return !Number.isNaN(d.getTime()) && d <= now && d >= min
}

export type ComputeTrajectoryInput = {
  birthDate?: string | null
  gradYear?: string | number | null
  currentUtr?: number | null
  /** Annual UTR improvement rate when projecting to graduation (default 0.35). */
  annualGrowth?: number
}

/**
 * Build a simple year-by-year UTR forecast to high-school graduation.
 */
export function computePlayerTrajectory(
  input: ComputeTrajectoryInput,
): PlayerTrajectory {
  const gradYear = parseGradYear(input.gradYear)
  const now = new Date()

  let currentAge: number
  let ageSource: PlayerTrajectory['ageSource'] = 'default'

  if (input.birthDate && isValidBirthDate(input.birthDate)) {
    currentAge = computeAge(input.birthDate, now)
    ageSource = 'birth_date'
  } else if (gradYear != null) {
    currentAge = estimateAgeFromGradYear(gradYear, now)
    ageSource = 'class_year_estimate'
  } else {
    currentAge = 12
    ageSource = 'default'
  }

  let graduationAge: number
  if (input.birthDate && isValidBirthDate(input.birthDate) && gradYear != null) {
    graduationAge = computeAgeAt(
      input.birthDate,
      new Date(`${gradYear}-06-01T12:00:00`),
    )
  } else if (gradYear != null) {
    graduationAge = 17
  } else {
    graduationAge = Math.min(18, currentAge + 5)
  }

  const yearsToGrad = Math.max(0, graduationAge - currentAge)
  const growth = input.annualGrowth ?? 0.35
  const currentUtr =
    input.currentUtr != null && input.currentUtr > 0 ? input.currentUtr : null

  const points: PlayerTrajectoryPoint[] = []
  if (currentUtr != null) {
    for (let y = 0; y <= yearsToGrad; y++) {
      const age = currentAge + y
      const utr = Math.min(16.5, currentUtr + growth * y)
      points.push({
        age,
        utr: Math.round(utr * 100) / 100,
        label: y === 0 ? 'now' : y === yearsToGrad ? 'grad' : undefined,
      })
    }
  }

  const forecastUtrAtGraduation =
    points.length > 0 ? points[points.length - 1].utr : null

  return {
    currentAge,
    graduationAge,
    gradYear,
    currentUtr,
    forecastUtrAtGraduation,
    points,
    ageSource,
  }
}
