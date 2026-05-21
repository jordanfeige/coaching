"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, Dumbbell, PlayCircle, UserRound } from "lucide-react"

const tabs = [
  { href: "/player", label: "Home", Icon: Home },
  { href: "/player/journey", label: "Journey", Icon: TrendingUp },
  { href: "/player/training", label: "Training", Icon: Dumbbell },
  { href: "/player/reels", label: "Reels", Icon: PlayCircle },
  { href: "/player/coach", label: "Coach", Icon: UserRound },
]

export default function PlayerBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="player-bottom-nav fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[520px] border-t bg-white px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
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
              className="flex flex-1 flex-col items-center gap-1 py-1.5"
              style={{ color: isActive ? "#0F6E56" : "#9CA3AF" }}
            >
              <div
                className="rounded-full px-3.5 py-1.5 transition-colors"
                style={{ background: isActive ? "#E1F5EE" : "transparent" }}
              >
                <t.Icon size={22} strokeWidth={1.8} />
              </div>
              <span
                className="text-[10.5px] tracking-wide"
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
