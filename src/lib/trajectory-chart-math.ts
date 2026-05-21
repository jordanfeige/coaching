import type { TrajectoryPoint } from '@/lib/utr-forecast'

export const CHART = {
  width: 720,
  height: 270,
  padL: 44,
  padR: 72,
  padT: 36,
  padB: 32,
  minUtr: 5,
  maxUtr: 13,
  minAge: 8,
  maxAge: 19,
} as const

export function xForAge(age: number): number {
  const { width, padL, padR, minAge, maxAge } = CHART
  return padL + ((age - minAge) / (maxAge - minAge)) * (width - padL - padR)
}

export function yForUtr(utr: number): number {
  const { height, padT, padB, minUtr, maxUtr } = CHART
  return (
    height -
    padB -
    ((utr - minUtr) / (maxUtr - minUtr)) * (height - padT - padB)
  )
}

export function pathFromPoints(points: TrajectoryPoint[]): string {
  if (!points.length) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForAge(p.age)} ${yForUtr(p.utr)}`)
    .join(' ')
}

export const BRACKET_AGES = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
