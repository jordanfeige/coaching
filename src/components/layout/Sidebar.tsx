'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CalendarDays, Users, Video, LogOut, Megaphone, TrendingUp } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { glass } from '@/lib/glass'
import { isAdmin as hasAdminAccess } from '@/lib/admin'

const nav = [
  { href: '/dashboard/analytics', label: 'Pulse', icon: TrendingUp },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/dashboard/players', label: 'Players', icon: Users },
  { href: '/dashboard/video', label: 'Reels', icon: Video },
  { href: '/dashboard/bulletin', label: 'Bulletin', icon: Megaphone },
]

const growthNav = [
  { href: '/dashboard/waitlist', label: 'Waitlist', icon: TrendingUp },
]

function navLinkStyle(active: boolean) {
  return active
    ? glass.nav.coachNavActive
    : { ...glass.nav.coachNavInactive, background: 'transparent', border: 'none' }
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const isAdmin = hasAdminAccess(userEmail)

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserEmail(user?.email ?? null)
    }
    loadUser()
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <aside className="hidden min-h-screen w-56 flex-col md:flex" style={glass.nav.coachSidebar}>
        <div className="border-b border-white/40 p-5">
          <BrandMark size="md" href="/dashboard" />
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'shadow-sm' : 'rounded-lg',
                )}
                style={navLinkStyle(active)}
              >
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
          {isAdmin && (
            <>
              <div
                className="px-3 pt-5 pb-2 text-[11px] font-bold uppercase tracking-wide"
                style={{ color: glass.light.text.muted }}
              >
                Growth
              </div>
              {growthNav.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                      active ? 'shadow-sm' : 'rounded-lg',
                    )}
                    style={navLinkStyle(active)}
                  >
                    <Icon size={17} />
                    {label}
                  </Link>
                )
              })}
            </>
          )}
        </nav>
        <div className="border-t border-white/40 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            style={{ color: glass.light.text.secondary }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 md:hidden"
        style={glass.nav.coachSidebar}
      >
        {nav
          .filter(n => n.href !== '/dashboard')
          .map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors"
                style={navLinkStyle(active)}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            )
          })}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5"
          style={{ color: glass.light.text.muted }}
        >
          <LogOut size={20} />
          <span className="text-xs font-medium">Sign out</span>
        </button>
      </nav>
    </>
  )
}
