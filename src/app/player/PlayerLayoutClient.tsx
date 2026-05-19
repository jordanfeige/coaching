'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Dumbbell, Home, LogOut, Megaphone, Menu, NotebookTabs, Video } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { createClient } from '@/lib/supabase'
import { brand } from '@/lib/brand'
import { cn } from '@/lib/utils'

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

const navItems = [
  { href: '/player', label: 'Dashboard', icon: Home, exact: true },
  { href: '/player/reels', label: 'Reels', icon: Video },
  { href: '/player/progress', label: 'Progress', icon: BarChart3 },
  { href: '/player/drills', label: 'My Drills', icon: Dumbbell },
  { href: '/player/lessons', label: 'Lessons', icon: NotebookTabs },
  { href: '/player/bulletin', label: 'Bulletin', icon: Megaphone },
]

export default function PlayerLayoutClient({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="flex min-h-screen" style={{ background: brand.bg }}>
      <aside className="hidden min-h-screen w-56 flex-col border-r md:flex" style={{ background: brand.card, borderColor: brand.border }}>
        <div className="border-b p-5" style={{ borderColor: brand.border }}>
          <BrandMark size="md" href="/player" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  background: active ? brand.tealLight : undefined,
                  color: active ? brand.teal : brand.textSecondary,
                }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t p-3" style={{ borderColor: brand.border }}>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            style={{ color: brand.textSecondary }}
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div
        className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b px-4 md:hidden"
        style={{ background: brand.card, borderColor: brand.border }}
      >
        <BrandMark size="sm" href="/player" />
        <Menu className="size-5" style={{ color: brand.textSecondary }} />
      </div>

      <main className="flex-1 overflow-auto pb-20 pt-14 md:pb-0 md:pt-0">
        <div className="mx-auto max-w-4xl p-4 md:p-8">{children}</div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t px-1 py-2 md:hidden"
        style={{ background: brand.card, borderColor: brand.border }}
      >
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={cn('flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors')}
              style={{
                background: active ? brand.tealLight : undefined,
                color: active ? brand.teal : brand.textSecondary,
              }}
            >
              <Icon className="size-4" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
