'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dumbbell, Home, LogOut, Menu, PlayCircle, TrendingUp, UserRound } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import PlayerBottomNav from '@/components/player/PlayerBottomNav'
import { createClient } from '@/lib/supabase'
import { glass } from '@/lib/glass'

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
  return active
    ? glass.nav.coachNavActive
    : { ...glass.nav.coachNavInactive, background: 'transparent', border: 'none' }
}

export default function PlayerLayoutClient({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const navItems = playerNavItems

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden min-h-screen w-56 flex-col border-r border-border bg-card md:flex"
      >
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
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors"
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
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <BrandMark size="sm" href="/player" />
          <Menu className="size-5 text-muted-foreground" />
        </div>

        <main className="flex-1 overflow-auto pb-24 pt-14 md:pb-0 md:pt-0">
          <div className="mx-auto max-w-4xl p-4 md:p-8">{children}</div>
        </main>

        <div className="md:hidden">
          <PlayerBottomNav />
        </div>
      </div>
    </div>
  )
}
