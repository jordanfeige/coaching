export type ViaPageId =
  | 'dashboard-home'
  | 'players-list'
  | 'player-profile'
  | 'player-profile-recruiting'
  | 'schedule'
  | 'reels-coach'
  | 'player-home'
  | 'player-reels'
  | 'player-reel-detail'
  | 'player-progress'
  | 'player-recruiting'
  | 'pulse'

export type PageContext = {
  page: ViaPageId
  playerId?: string
  playerName?: string
  playerFirstName?: string
  activeIssue?: string
  techniqueScore?: number
  scoreDelta?: number
  nextLessonDate?: string
  nextLessonPlayerName?: string
  unverifiedCount?: number
  sessionCount?: number
  latestScore?: number
  targetDivision?: string
  utrSingles?: number
  reelDate?: string
  fixedCount?: number
  totalGain?: number
}

export type CoachBriefContext = {
  players?: Array<{ id: string; name: string }>
  recentSessions?: Array<{
    player_id: string
    overall_score?: number | null
    analyzed_at?: string | null
  }>
  upcomingLessons?: Array<{
    starts_at: string
    players?: { name?: string | null } | null
  }>
  unverifiedAnalyses?: unknown[]
}

export function formatLessonTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === now.toDateString()) {
    return (
      `today at ` +
      d.toLocaleTimeString('en', {
        hour: 'numeric',
        minute: '2-digit',
      })
    )
  }
  if (d.toDateString() === tomorrow.toDateString()) {
    return (
      `tomorrow at ` +
      d.toLocaleTimeString('en', {
        hour: 'numeric',
        minute: '2-digit',
      })
    )
  }
  return d.toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getAttentionPlayers(ctx: CoachBriefContext): string[] {
  if (!ctx?.players) return []
  const names: string[] = []

  const sessionsByPlayer = new Map<string, CoachBriefContext['recentSessions']>()
  ctx.recentSessions?.forEach(s => {
    if (!s.player_id) return
    const arr = sessionsByPlayer.get(s.player_id) || []
    arr.push(s)
    sessionsByPlayer.set(s.player_id, arr)
  })

  ctx.players.forEach(p => {
    const sessions = sessionsByPlayer.get(p.id) || []
    if (sessions.length === 0) {
      names.push(p.name.split(' ')[0])
    } else if (sessions.length >= 2) {
      const sorted = [...sessions].sort(
        (a, b) =>
          new Date(String(b.analyzed_at || 0)).getTime() -
          new Date(String(a.analyzed_at || 0)).getTime(),
      )
      const delta =
        Number(sorted[0]?.overall_score ?? 0) -
        Number(sorted[1]?.overall_score ?? 0)
      if (delta <= -10) {
        names.push(p.name.split(' ')[0])
      }
    }
  })

  return names.slice(0, 3)
}

export function generateDefaultBrief(ctx: CoachBriefContext): {
  brief: string
  prompts: string[]
} {
  const attention = getAttentionPlayers(ctx)
  const next = ctx.upcomingLessons?.[0]
  let brief = ''
  if (attention.length > 0) {
    brief = `${attention[0]} needs your attention today.`
    if (attention.length > 1) {
      brief += ` ${attention.length - 1} more too.`
    }
  } else if (next) {
    brief = `Next up: ${next.players?.name || 'a player'} ${formatLessonTime(next.starts_at)}.`
  } else {
    brief = `${ctx.players?.length || 0} players on your roster. What do you need?`
  }
  return {
    brief,
    prompts: [
      'Who needs my attention?',
      next ? `Open ${next.players?.name || 'player'}'s lesson` : 'Schedule a lesson',
      (ctx.unverifiedAnalyses?.length ?? 0) > 0
        ? `Verify ${ctx.unverifiedAnalyses!.length} reels`
        : 'Show my players',
      "What's on today?",
    ].filter(Boolean).slice(0, 4) as string[],
  }
}

export function generatePageBrief(
  ctx: CoachBriefContext,
  pageContext?: PageContext,
): { brief: string; prompts: string[] } {
  if (!pageContext) {
    return generateDefaultBrief(ctx)
  }

  const firstName =
    pageContext.playerFirstName ||
    pageContext.playerName?.split(' ')[0] ||
    ''

  switch (pageContext.page) {
    case 'dashboard-home': {
      const attention = getAttentionPlayers(ctx)
      const next = ctx.upcomingLessons?.[0]
      let brief = ''
      if (attention.length > 0) {
        brief = `${attention[0]} needs your attention today.`
        if (attention.length > 1) {
          brief += ` ${attention.length - 1} more too.`
        }
      } else if (next) {
        brief = `Next up: ${next.players?.name || 'a player'} ${formatLessonTime(next.starts_at)}.`
      } else {
        brief = `${ctx.players?.length || 0} players on your roster. What do you need?`
      }
      return {
        brief,
        prompts: [
          'Who needs my attention?',
          next
            ? `Open ${next.players?.name || 'player'}'s lesson`
            : 'Schedule a lesson',
          (ctx.unverifiedAnalyses?.length ?? 0) > 0
            ? `Verify ${ctx.unverifiedAnalyses!.length} reels`
            : 'Show my players',
          "What's on today?",
        ].filter(Boolean).slice(0, 4) as string[],
      }
    }

    case 'players-list': {
      const attention = getAttentionPlayers(ctx)
      const brief =
        attention.length > 0
          ? `${attention.join(' and ')} need your attention.`
          : `${ctx.players?.length || 0} players. All looking good.`
      return {
        brief,
        prompts: [
          'Who needs my attention?',
          "Who hasn't had a session?",
          'Show regressions',
          'Create a group drill',
        ],
      }
    }

    case 'player-profile': {
      const brief = pageContext.activeIssue
        ? `${firstName}'s active issue is ${pageContext.activeIssue}. ` +
          (pageContext.nextLessonDate
            ? `Next lesson ${pageContext.nextLessonDate}.`
            : '')
        : `${firstName} has ${pageContext.sessionCount || 0} sessions. ` +
          (pageContext.techniqueScore
            ? `Latest score ${pageContext.techniqueScore}.`
            : 'No sessions yet.')
      return {
        brief,
        prompts: [
          `Create a drill for ${firstName}`,
          pageContext.nextLessonDate
            ? `Build ${firstName}'s lesson plan`
            : `Schedule ${firstName}`,
          `Summarize ${firstName}'s progress`,
          `What should ${firstName} focus on next?`,
        ],
      }
    }

    case 'player-profile-recruiting': {
      const brief = pageContext.utrSingles
        ? `${firstName}'s UTR is ${pageContext.utrSingles}. ` +
          (pageContext.targetDivision
            ? `Targeting ${pageContext.targetDivision}.`
            : '')
        : `${firstName}'s recruiting profile needs UTR data.`
      return {
        brief,
        prompts: [
          `Show schools matching ${firstName}`,
          `What does ${firstName} need for ${pageContext.targetDivision || 'D1'}?`,
          `Generate ${firstName}'s projection`,
          `Compare ${firstName} to D1 benchmarks`,
        ],
      }
    }

    case 'schedule': {
      const brief = pageContext.nextLessonPlayerName
        ? `${pageContext.nextLessonPlayerName} is up next ${pageContext.nextLessonDate || ''}.`
        : 'No upcoming lessons. Want to schedule some?'
      return {
        brief,
        prompts: [
          pageContext.nextLessonPlayerName
            ? `Build ${pageContext.nextLessonPlayerName}'s drill plan`
            : 'Schedule a lesson',
          "What's on this week?",
          'Show unscheduled players',
          'Create group session',
        ],
      }
    }

    case 'reels-coach': {
      const count = pageContext.unverifiedCount ?? 0
      const brief =
        count > 0
          ? `${count} reel${count > 1 ? 's' : ''} need verification.`
          : 'All reels verified.'
      return {
        brief,
        prompts: [
          'Show unverified reels',
          'What issues are trending?',
          'Compare recent sessions',
          'Who improved most this week?',
        ],
      }
    }

    case 'player-home': {
      const brief =
        pageContext.scoreDelta && pageContext.scoreDelta > 0
          ? `Score up ${pageContext.scoreDelta}pts this week. ` +
            (pageContext.activeIssue
              ? `${pageContext.activeIssue} is the focus.`
              : '')
          : pageContext.techniqueScore
            ? `Latest score ${pageContext.techniqueScore}. ` +
              (pageContext.activeIssue
                ? `Working on ${pageContext.activeIssue}.`
                : '')
            : 'Upload your first reel to start tracking progress.'
      return {
        brief,
        prompts: [
          'Add a reel',
          'How am I improving?',
          'Show my drills',
          "When's my next lesson?",
        ],
      }
    }

    case 'player-reels': {
      const brief =
        `${pageContext.sessionCount || 0} sessions total. ` +
        (pageContext.latestScore
          ? `Latest score ${pageContext.latestScore}.`
          : '')
      return {
        brief,
        prompts: [
          'Add a reel',
          'Compare my last two reels',
          'What improved most?',
          'Show my worst checkpoint',
        ],
      }
    }

    case 'player-reel-detail': {
      const brief = pageContext.activeIssue
        ? `${pageContext.reelDate || 'This reel'} — score ${pageContext.techniqueScore}. ${pageContext.activeIssue} flagged.`
        : `Score ${pageContext.techniqueScore} on ${pageContext.reelDate || 'this reel'}.`
      return {
        brief,
        prompts: [
          'Tell me about this reel',
          'How does this compare to my last session?',
          'Show the drill for this',
          'What should I fix first?',
        ],
      }
    }

    case 'player-progress': {
      const brief =
        pageContext.totalGain && pageContext.totalGain > 0
          ? `Up ${pageContext.totalGain}pts overall. ` +
            (pageContext.fixedCount
              ? `${pageContext.fixedCount} issue${pageContext.fixedCount > 1 ? 's' : ''} fixed.`
              : '')
          : 'Track your technique progress over time.'
      return {
        brief,
        prompts: [
          "What's my biggest win?",
          "What's holding me back?",
          pageContext.activeIssue
            ? `How long to fix ${pageContext.activeIssue}?`
            : 'What should I focus on?',
          'Show my best session',
        ],
      }
    }

    case 'player-recruiting': {
      const brief = pageContext.utrSingles
        ? `UTR ${pageContext.utrSingles}. ` +
          (pageContext.targetDivision
            ? `${pageContext.targetDivision} is your target.`
            : '')
        : 'Build your recruiting profile to see matching schools.'
      return {
        brief,
        prompts: [
          'What schools fit me?',
          pageContext.targetDivision
            ? `What do I need for ${pageContext.targetDivision}?`
            : 'What division fits my UTR?',
          'How does my schedule look?',
          'When should I contact coaches?',
        ],
      }
    }

    case 'pulse': {
      const attention = getAttentionPlayers(ctx)
      const brief =
        attention.length > 0
          ? `${attention.length} player${attention.length > 1 ? 's' : ''} need attention. ${attention[0]} first.`
          : 'Roster looking healthy. What do you need?'
      return {
        brief,
        prompts: [
          'Who needs help now?',
          'Show score trends',
          'What issues are common?',
          "Who's improving fastest?",
        ],
      }
    }

    default:
      return generateDefaultBrief(ctx)
  }
}

export function generatePlayerPageBrief(
  pageContext?: PageContext,
): { brief: string; prompts: string[] } {
  if (!pageContext) {
    return {
      brief: 'Ask Via anything about your training.',
      prompts: ['How am I improving?', 'Add a reel', 'Show my drills'],
    }
  }
  return generatePageBrief({}, pageContext)
}
