'use client'

import type { JourneyCategory } from '@/lib/journey-types'
import { CATEGORY_UI_META } from '@/lib/journey-ui-meta'
import { CATEGORY_COLORS } from '@/components/journey/JourneyTokens'
import {
  deriveSubScoreNudge,
  type SubScoreNudgeContext,
} from '@/lib/journey-subscore-nudges'
import { SubScoreTile } from '@/components/player/journey-desktop/SubScoreTile'

const NUDGE_ICON_BY_CATEGORY = {
  tennis: 'arrow-up-right',
  academics: 'upload',
  coachability: 'video',
  exposure: 'trophy',
} as const

type Props = {
  categories: JourneyCategory[]
  nudgeContext: SubScoreNudgeContext
  onTileClick: (key: string) => void
}

export function SubScoreTilesGrid({
  categories,
  nudgeContext,
  onTileClick,
}: Props) {
  const tiles = categories.map(cat => {
    const meta = CATEGORY_UI_META[cat.key]
    const colors = CATEGORY_COLORS[cat.key]
    const nudge = deriveSubScoreNudge(cat.key, nudgeContext)
    const nudgeIcon =
      cat.key === 'academics' && nudgeContext.hasTranscript
        ? 'trending-up'
        : NUDGE_ICON_BY_CATEGORY[cat.key]

    return {
      category: cat.key,
      name:
        cat.key === 'academics'
          ? 'Academic'
          : meta.shortLabel,
      icon: cat.icon || meta.icon,
      weight: cat.weight,
      scorePct: cat.pct,
      scoreColor: colors?.color ?? '#0F6E56',
      nudgeText: nudge.text,
      nudgeIcon,
      nudgeIsWarn: nudge.isWarn,
    }
  })

  return (
    <>
      <style>{`
        .journey-subscore-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 0;
        }
        @media (min-width: 640px) {
          .journey-subscore-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
      <div className="journey-subscore-grid">
        {tiles.map(t => (
          <SubScoreTile
            key={t.category}
            category={t.category}
            name={t.name}
            icon={t.icon}
            weight={t.weight}
            scorePct={t.scorePct}
            scoreColor={t.scoreColor}
            nudgeText={t.nudgeText}
            nudgeIcon={t.nudgeIcon}
            nudgeIsWarn={t.nudgeIsWarn}
            onClick={() => onTileClick(t.category)}
          />
        ))}
      </div>
    </>
  )
}
