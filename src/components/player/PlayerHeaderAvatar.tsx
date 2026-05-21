'use client'

import Link from 'next/link'
import { brand, fonts } from '@/lib/brand'

type Props = {
  playerName?: string
  href?: string
}

function initials(name?: string): string {
  if (!name?.trim()) return 'PV'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export default function PlayerHeaderAvatar({
  playerName,
  href = '/player/settings',
}: Props) {
  const label = initials(playerName)

  return (
    <Link
      href={href}
      aria-label="Profile and settings"
      title="Profile & settings"
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: brand.tealDarkHex,
        color: 'white',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.sans,
        fontSize: 13,
        fontWeight: 700,
        textDecoration: 'none',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
      className="player-header-avatar"
    >
      <style>{`
        .player-header-avatar:hover {
          background: ${brand.tealHex};
        }
      `}</style>
      {label}
    </Link>
  )
}
