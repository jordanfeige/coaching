"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, Trophy, Dumbbell, PlayCircle } from "lucide-react"

const tabs = [
  { href: "/player", label: "Home", Icon: Home },
  { href: "/player/journey", label: "Journey", Icon: TrendingUp },
  { href: "/player/recruiting", label: "Recruiting", Icon: Trophy },
  { href: "/player/training", label: "Training", Icon: Dumbbell },
  { href: "/player/reels", label: "Reels", Icon: PlayCircle },
]

export default function PlayerBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="player-bottom-nav fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[520px] border-t bg-white px-0.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      style={{ borderColor: "#E5E7EB" }}
    >
      <div className="flex items-stretch justify-between">
        {tabs.map(t => {
          const isActive =
            t.href === "/player"
              ? pathname === "/player"
              : pathname.startsWith(t.href)

          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1"
              style={{ color: isActive ? "#0F6E56" : "#9CA3AF" }}
            >
              <div
                className="rounded-full px-2 py-1 transition-colors"
                style={{ background: isActive ? "#E1F5EE" : "transparent" }}
              >
                <t.Icon size={20} strokeWidth={1.8} />
              </div>
              <span
                className="max-w-full truncate text-[9.5px] tracking-wide"
                style={{
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? "#0F6E56" : "#6B7280",
                }}
              >
                {t.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
