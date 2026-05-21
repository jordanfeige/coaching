export type PrimaryGoal =
  | 'recruited_college'
  | 'scholarship_smaller'
  | 'win_highest_level'
  | 'improve_have_fun'
  | 'help_my_child'
  | 'not_sure_yet'
  | null

const RECRUITING_GOALS: PrimaryGoal[] = [
  'recruited_college',
  'scholarship_smaller',
  'not_sure_yet',
]

export function isRecruitingTrack(goal: PrimaryGoal): boolean {
  if (!goal) return false
  return RECRUITING_GOALS.includes(goal)
}

export function shouldShowRecruitingBanner(args: {
  goal: PrimaryGoal
  notRecruiting: boolean
  bannerDismissed: boolean
  wizardCompletedAt: string | null
}): boolean {
  if (args.notRecruiting) return false
  if (args.bannerDismissed) return false
  if (args.wizardCompletedAt) return false
  return isRecruitingTrack(args.goal)
}

export const RECRUITING_BANNER_HEADLINES: Record<string, string> = {
  recruited_college:
    'Ready to start tracking your college recruiting journey?',
  scholarship_smaller: 'Build your scholarship profile in 90 seconds.',
  not_sure_yet: "Curious where you'd stand against college rosters?",
}
