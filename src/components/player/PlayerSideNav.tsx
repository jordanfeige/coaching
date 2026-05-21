'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Dumbbell,
  Home,
  LogOut,
  PlayCircle,
  TrendingUp,
  User,
  UserRound,
} from 'lucide-react'
import { brand, fonts, layout } from '@/lib/brand'
import { createClient } from '@/lib/supabase'

const PLAYER_NAV = [
  { key: 'home', label: 'Home', Icon: Home, href: '/player' },
  { key: 'journey', label: 'Journey', Icon: TrendingUp, href: '/player/journey' },
  { key: 'training', label: 'Training', Icon: Dumbbell, href: '/player/training' },
  { key: 'reels', label: 'Reels', Icon: PlayCircle, href: '/player/reels' },
  { key: 'coach', label: 'Coach', Icon: UserRound, href: '/player/coach' },
]

const SECONDARY_NAV = [
  { key: 'updates', label: 'Updates', Icon: Bell, href: '/player/bulletin' },
  { key: 'profile', label: 'Profile', Icon: User, href: '/player/settings' },
]

const NAV_LINK_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D9B7F] focus-visible:ring-offset-2'

export default function PlayerSideNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  function isActive(href: string) {
    if (href === '/player') return pathname === '/player'
    return pathname?.startsWith(href) ?? false
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="flex"
      style={{
        width: layout.navWidth,
        flexShrink: 0,
        background: brand.cream,
        borderRight: `1px solid ${brand.line}`,
        padding: '28px 18px 24px',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div
        style={{
          fontFamily: fonts.serif,
          fontSize: 26,
          fontWeight: 700,
          marginBottom: 36,
          paddingLeft: 8,
          letterSpacing: '-0.5px',
          color: brand.ink,
        }}
      >
        Play<span style={{ color: brand.tealHex, fontStyle: 'italic' }}>via</span>
      </div>

      <nav style={{ flex: 1 }}>
        {PLAYER_NAV.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.key}
              href={item.href}
              className={NAV_LINK_FOCUS}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                marginBottom: 4,
                background: active ? 'white' : 'transparent',
                border: active ? `1px solid ${brand.line}` : '1px solid transparent',
                borderRadius: 12,
                color: active ? brand.tealDarkHex : brand.sub,
                fontFamily: fonts.sans,
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                textDecoration: 'none',
                outline: 'none',
                transition: 'all 0.15s',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
              }}
            >
              <item.Icon size={20} strokeWidth={1.8} />
              <span>{item.label}</span>
              {active && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: brand.tealHex,
                  }}
                />
              )}
            </Link>
          )
        })}

        <div style={{ height: 1, background: brand.line, margin: '14px 8px' }} />

        {SECONDARY_NAV.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.key}
              href={item.href}
              className={NAV_LINK_FOCUS}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                marginBottom: 4,
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 12,
                color: active ? brand.tealDarkHex : brand.muted,
                fontFamily: fonts.sans,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                outline: 'none',
              }}
            >
              <item.Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        className={NAV_LINK_FOCUS}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          marginBottom: 8,
          background: 'transparent',
          border: 'none',
          borderRadius: 12,
          color: brand.muted,
          fontFamily: fonts.sans,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none',
        }}
      >
        <LogOut size={18} strokeWidth={1.8} />
        Sign out
      </button>

      <div
        style={{
          paddingTop: 12,
          borderTop: `1px solid ${brand.line}`,
          fontFamily: fonts.serif,
          fontSize: 11,
          fontStyle: 'italic',
          color: brand.muted,
          textAlign: 'center',
          letterSpacing: '0.01em',
        }}
      >
        Play, via AI.
      </div>
    </aside>
  )
}
