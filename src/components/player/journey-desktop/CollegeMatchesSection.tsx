'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import CollegeMatchesSummary from '@/components/player/journey-desktop/CollegeMatchesSummary'
import CollegeMatchesDrawer from '@/components/player/journey-desktop/CollegeMatchesDrawer'
import type {
  CollegeMatchDrawerTab,
  CollegeMatchRow,
} from '@/lib/college-matching-ui'

type ApiResponse = {
  showSection: boolean
  wizardComplete: boolean
  summary: { total: number; likely: number; target: number; reach: number }
  matches: CollegeMatchRow[]
  playerSnapshot: {
    utr: number | null
    projectedUtr: number | null
    classYear: number | null
    gpa: number | null
    sat: number | null
    targetDivision: string | null
  } | null
}

export default function CollegeMatchesSection() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<CollegeMatchDrawerTab>('all')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/journey/college-matches')
      if (!res.ok) throw new Error('Failed to load matches')
      setData((await res.json()) as ApiResponse)
    } catch (e) {
      console.error(e)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const savedCount = useMemo(
    () => (data?.matches ?? []).filter(m => m.saved).length,
    [data?.matches],
  )

  const openDrawer = useCallback((tab: CollegeMatchDrawerTab = 'all') => {
    setDrawerTab(tab)
    setDrawerOpen(true)
  }, [])

  const handleMatchesChange = useCallback((matches: CollegeMatchRow[]) => {
    setData(prev =>
      prev
        ? {
            ...prev,
            matches,
          }
        : prev,
    )
  }, [])

  if (loading || !data?.showSection) return null

  return (
    <div id="college-matches">
      <CollegeMatchesSummary
        summary={data.summary}
        savedCount={savedCount}
        topMatches={data.matches.slice(0, 3)}
        wizardComplete={data.wizardComplete}
        onOpenDrawer={openDrawer}
      />
      <CollegeMatchesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialTab={drawerTab}
        matches={data.matches}
        summary={data.summary}
        playerSnapshot={data.playerSnapshot}
        onMatchesChange={handleMatchesChange}
      />
    </div>
  )
}
