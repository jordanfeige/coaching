'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dumbbell, Home, LogOut, Menu, PlayCircle, TrendingUp, UserRound } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import PlayerBottomNav from '@/components/player/PlayerBottomNav'
import PlayerSideNav from '@/components/player/PlayerSideNav'
import UniversalViaBar from '@/components/player/UniversalViaBar'
import PlayerDesktopViaPanel from '@/components/player/PlayerDesktopViaPanel'
import { createClient } from '@/lib/supabase'
import { brand, layout } from '@/lib/brand'
import { usePlayerDesktopLayout } from '@/hooks/usePlayerDesktopLayout'
import type { PageContext } from '@/lib/via-page-brief'

type PlayerForChat = {
  id: string
  name: string
  sport: string
  skillLevel?: string
}

interface Props {
  children: React.ReactNode
  player: PlayerForChat | null
}

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  exact?: boolean
}

const playerNavItems: NavItem[] = [
  { href: '/player', label: 'Home', icon: Home, exact: true },
  { href: '/player/journey', label: 'Journey', icon: TrendingUp },
  { href: '/player/training', label: 'Training', icon: Dumbbell },
  { href: '/player/reels', label: 'Reels', icon: PlayCircle },
  { href: '/player/coach', label: 'Coach', icon: UserRound },
]

function playerNavStyle(active: boolean) {
  if (active) {
    return {
      background: 'white',
      border: `1px solid ${brand.line}`,
      borderRadius: 12,
      color: brand.tealDarkHex,
      fontWeight: 700,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      outline: 'none',
    }
  }
  return {
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 12,
    color: brand.sub,
    fontWeight: 500,
    outline: 'none',
  }
}

const NAV_LINK_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D9B7F] focus-visible:ring-offset-2'

function desktopPageContext(pathname: string): PageContext {
  if (pathname.startsWith('/player/journey')) {
    return { page: 'player-journey' }
  }
  if (pathname.startsWith('/player/reels')) {
    return { page: 'player-reels' }
  }
  if (pathname.startsWith('/player/training')) {
    return { page: 'player-training' }
  }
  if (pathname.startsWith('/player/coach')) {
    return { page: 'player-coach' }
  }
  return { page: 'player-home' }
}

export default function PlayerLayoutClient({ children, player }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isDesktop = usePlayerDesktopLayout()
  const navItems = playerNavItems
  const isHome = pathname === '/player'
  const contentMax = isHome ? layout.contentMaxHome : layout.contentMax
  const showDesktopViaBar = !isHome

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="flex min-h-screen" style={{ background: brand.paper }}>
      {/* Desktop cream nav — not mounted below 1024px (JS gate, not CSS-only) */}
      {isDesktop && (
        <div className="player-desktop-sidebar">
          <PlayerSideNav />
        </div>
      )}

      {/* Tablet sidebar: 768px–1023px only (hidden on desktop via JS + CSS) */}
      {!isDesktop && (
        <aside className="player-tablet-sidebar hidden min-h-screen w-56 flex-col border-r border-border bg-card md:flex">
          <div className="border-b border-border p-5">
            <BrandMark size="md" href="/player" />
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${NAV_LINK_FOCUS}`}
                  style={playerNavStyle(active)}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={handleSignOut}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground ${NAV_LINK_FOCUS}`}
              style={{ outline: 'none' }}
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </aside>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {!isDesktop && (
          <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <BrandMark size="sm" href="/player" />
            <Menu className="size-5 text-muted-foreground" />
          </div>
        )}

        <main
          className="flex-1 overflow-auto"
          style={{
            paddingBottom: isDesktop ? 0 : undefined,
            paddingTop: isDesktop ? 0 : undefined,
          }}
        >
          {!isDesktop && (
            <div className="mx-auto max-w-4xl p-4 pb-24 pt-14 md:p-8">{children}</div>
          )}

          {isDesktop && (
            <div
              className="mx-auto"
              style={{
                maxWidth: contentMax,
                padding: `${layout.contentPaddingTop}px ${layout.contentPaddingX}px ${layout.contentPaddingBottom}px`,
              }}
            >
              <div id="player-via-top">
                {showDesktopViaBar && <UniversalViaBar />}
                <PlayerDesktopViaPanel
                  playerId={player?.id}
                  playerName={player?.name}
                  pageContext={desktopPageContext(pathname ?? '/player')}
                />
              </div>
              {children}
            </div>
          )}
        </main>

        {!isDesktop && <PlayerBottomNav />}
      </div>
    </div>
  )
}
