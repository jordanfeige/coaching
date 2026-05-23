'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { brand } from '@/lib/brand'

export type ReelsTab = 'practice' | 'match-film'

export function ReelsSubTabs({ showMatchFilm }: { showMatchFilm: boolean }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: ReelsTab =
    showMatchFilm && tabParam === 'match-film' ? 'match-film' : 'practice'

  const tabs: Array<{ id: ReelsTab; label: string; href: string }> = [
    { id: 'practice', label: 'Practice', href: '/player/reels' },
  ]

  if (showMatchFilm) {
    tabs.push({
      id: 'match-film',
      label: 'Match Film',
      href: '/player/reels?tab=match-film',
    })
  }

  return (
    <nav
      style={{
        background: brand.card,
        borderRadius: 10,
        padding: 5,
        display: 'inline-flex',
        gap: 2,
        marginBottom: 14,
        border: `0.5px solid ${brand.line}`,
        flexWrap: 'wrap',
      }}
    >
      {tabs.map(item => {
        const isActive = activeTab === item.id
        return (
          <Link
            key={item.id}
            href={item.href}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 6,
              color: isActive ? '#fff' : brand.sub,
              background: isActive ? brand.tealDeep : 'transparent',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function useReelsActiveTab(showMatchFilm: boolean): ReelsTab {
  const searchParams = useSearchParams()
  if (showMatchFilm && searchParams.get('tab') === 'match-film') {
    return 'match-film'
  }
  return 'practice'
}
