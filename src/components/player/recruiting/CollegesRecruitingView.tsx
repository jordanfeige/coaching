'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import CollegeMatchesSummary from '@/components/player/journey-desktop/CollegeMatchesSummary'
import CollegeMatchesDrawer from '@/components/player/journey-desktop/CollegeMatchesDrawer'
import { usePageReady } from '@/contexts/PageLoadingContext'
import { brand, fonts } from '@/lib/brand'
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

export default function CollegesRecruitingView() {
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

  usePageReady(!loading)

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

  if (loading) {
    return null
  }

  if (!data) {
    return (
      <div
        style={{
          background: brand.paper,
          border: `1px solid ${brand.line}`,
          borderRadius: 16,
          padding: '20px 22px',
          fontFamily: fonts.sans,
          fontSize: 14,
          color: brand.sub,
        }}
      >
        Could not load college matches. Try again later.
      </div>
    )
  }

  if (!data.showSection || !data.wizardComplete) {
    return (
      <div
        style={{
          background: brand.paper,
          border: `1px solid ${brand.line}`,
          borderRadius: 16,
          padding: '20px 22px',
        }}
      >
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.sub,
            marginBottom: 8,
          }}
        >
          Your college matches
        </div>
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: brand.sub,
            lineHeight: 1.55,
            margin: '0 0 14px',
          }}
        >
          Complete your Journey profile to see matching schools.
        </p>
        <Link
          href="/onboarding/journey/utr"
          style={{
            fontFamily: fonts.sans,
            fontSize: 13,
            fontWeight: 700,
            color: brand.tealDarkHex,
          }}
        >
          Continue Journey setup →
        </Link>
      </div>
    )
  }

  return (
    <>
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
    </>
  )
}
