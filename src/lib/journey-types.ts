import type { SubScoreNudgeContext } from './journey-subscore-nudges'

export type Severity = 'critical' | 'important' | 'minor' | 'done'
export type Difficulty = 1 | 2 | 3

export type CategoryKey = 'tennis' | 'academics' | 'exposure' | 'coachability'

export type JourneyExposureSignal = {
  key: string
  label: string
  value: string
  verified: boolean
  sourceLabel: string
}

export interface JourneyCategory {
  key: CategoryKey
  label: string
  shortLabel: string
  weight: number
  score: number
  pct: number
  icon: string
  tagline: string
  gap: string
  isStrength?: boolean
  viaPrompts: string[]
  inputs: {
    name: string
    value: string
    source: string
    verified: boolean
    date: string
  }[]
  /** UTR match-history signals when Exposure uses match_results scoring */
  exposureSignals?: JourneyExposureSignal[]
}

export interface JourneyQuest {
  id: string
  icon: string
  title: string
  severity: Severity
  reward: number
  earned?: number
  difficulty: Difficulty
  timeWindow: string
  desc: string
  affects: string
  affectsKey: CategoryKey
  progress: number
  probability: string
  viaPrompts: string[]
  completedAt?: string
}

export interface JourneyMilestone {
  label: string
  status: 'done' | 'active' | 'locked'
  detail: string
  completedAt?: string
  progress?: number
  pointsToUnlock?: number
  viaPrompts?: string[]
}

export interface JourneyEvent {
  date: string
  label: string
  change: string
  delta: string
  category: CategoryKey | 'tier'
}

export type JourneyPlayerCard = {
  name: string
  sport: string
  classYear: string
  tier: string
  nextTier: string
  tierProgress: number
  journeyRating: number
  ratingDelta: number | null
  pointsToNextTier: number
}

export type JourneyRoadToOfferData = {
  goalKey: string
  classYear: number
  currentUtr: number
  currentGpa: number | null
  qualityWinsLast12Mo: number
}

export type JourneyPageCoreViewModel = {
  player: JourneyPlayerCard
  categories: JourneyCategory[]
  milestones: JourneyMilestone[]
  quests: JourneyQuest[]
  events: JourneyEvent[]
  weightsVersion: string
  isEmpty: boolean
  utrSingles: number | null
}

export type JourneyPageViewModel = JourneyPageCoreViewModel & {
  roadToOffer: JourneyRoadToOfferData
  nudgeContext: SubScoreNudgeContext
}
