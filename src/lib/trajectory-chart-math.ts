import type { TrajectoryPoint } from '@/lib/utr-forecast'

export const CHART = {
  width: 720,
  height: 290,
  padL: 36,
  padR: 28,
  padT: 22,
  padB: 30,
  plotBottom: 260,
  minUtr: 5,
  maxUtr: 13,
  minAge: 8,
  maxAge: 19,
} as const

export const COMPACT = {
  width: 380,
  height: 70,
  padL: 28,
  padR: 44,
  padT: 16,
  padB: 12,
  plotBottom: 62,
  minUtr: 5,
  maxUtr: 13,
  minAge: 8,
  maxAge: 19,
} as const

export const USTA_BRACKETS = [
  { label: '12U', minAge: 11, maxAge: 12 },
  { label: '14U', minAge: 13, maxAge: 14 },
  { label: '16U', minAge: 15, maxAge: 16 },
  { label: '18U', minAge: 17, maxAge: 18 },
] as const

/** Vertical dividers between USTA brackets (age at boundary). */
export const BRACKET_DIVIDER_AGES = [11, 13, 15, 17] as const

export const Y_AXIS_UTR = [6, 8, 10, 12] as const

type ChartDims = {
  width: number
  height: number
  padL: number
  padR: number
  padT: number
  padB: number
  minUtr: number
  maxUtr: number
  minAge: number
  maxAge: number
}

function xForAgeIn(age: number, c: ChartDims): number {
  return c.padL + ((age - c.minAge) / (c.maxAge - c.minAge)) * (c.width - c.padL - c.padR)
}

function yForUtrIn(utr: number, c: ChartDims): number {
  return (
    c.height -
    c.padB -
    ((utr - c.minUtr) / (c.maxUtr - c.minUtr)) * (c.height - c.padT - c.padB)
  )
}

export function xForAge(age: number): number {
  return xForAgeIn(age, CHART)
}

export function yForUtr(utr: number): number {
  return yForUtrIn(utr, CHART)
}

export function ageForX(x: number): number {
  const { width, padL, padR, minAge, maxAge } = CHART
  const ratio = (x - padL) / (width - padL - padR)
  return minAge + ratio * (maxAge - minAge)
}

export function compactX(age: number): number {
  return xForAgeIn(age, COMPACT)
}

export function compactY(utr: number): number {
  return yForUtrIn(utr, COMPACT)
}

export function bracketCenterX(label: string): number {
  const b = USTA_BRACKETS.find(br => br.label === label)
  if (!b) return CHART.padL
  return xForAge((b.minAge + b.maxAge) / 2)
}

export function bracketBoundaryX(age: number): number {
  return xForAge(age)
}

export function compactBracketCenterX(label: string): number {
  const b = USTA_BRACKETS.find(br => br.label === label)
  if (!b) return COMPACT.padL
  return compactX((b.minAge + b.maxAge) / 2)
}

export function pathFromPoints(points: TrajectoryPoint[]): string {
  return pathFromPointsIn(points, CHART)
}

export function compactPathFromPoints(points: TrajectoryPoint[]): string {
  return pathFromPointsIn(points, COMPACT)
}

function pathFromPointsIn(points: TrajectoryPoint[], c: ChartDims): string {
  if (!points.length) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForAgeIn(p.age, c)} ${yForUtrIn(p.utr, c)}`)
    .join(' ')
}

export function utrAtAge(
  points: TrajectoryPoint[],
  age: number,
): number | null {
  if (!points.length) return null
  const sorted = [...points].sort((a, b) => a.age - b.age)
  if (age <= sorted[0].age) return sorted[0].utr
  const last = sorted[sorted.length - 1]
  if (age >= last.age) return last.utr
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (age >= a.age && age <= b.age) {
      const span = b.age - a.age
      if (span <= 0) return a.utr
      const t = (age - a.age) / span
      return a.utr + t * (b.utr - a.utr)
    }
  }
  return null
}

export function playerUtrAtAge(
  history: TrajectoryPoint[],
  forecast: TrajectoryPoint[],
  currentAge: number,
  age: number,
): number | null {
  if (age <= currentAge + 0.05) {
    return utrAtAge(history, age)
  }
  return utrAtAge(forecast, age)
}

/** @deprecated Use BRACKET_DIVIDER_AGES — kept for any legacy imports */
export const BRACKET_AGES = BRACKET_DIVIDER_AGES
