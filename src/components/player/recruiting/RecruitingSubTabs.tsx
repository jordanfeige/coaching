'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const subNav = [
  { label: 'Overview', href: '/player/recruiting' },
  { label: 'Colleges', href: '/player/recruiting/colleges' },
  { label: 'Exposure', href: '/player/recruiting/exposure' },
] as const

export function RecruitingSubTabs() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        background: 'white',
        borderRadius: 10,
        padding: 5,
        display: 'inline-flex',
        gap: 2,
        marginBottom: 14,
        border: '0.5px solid rgba(0,0,0,0.06)',
        flexWrap: 'wrap',
      }}
    >
      {subNav.map(item => {
        const isActive =
          item.href === '/player/recruiting'
            ? pathname === '/player/recruiting'
            : (pathname?.startsWith(item.href) ?? false)

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 6,
              color: isActive ? 'white' : '#666',
              background: isActive ? '#0A2A22' : 'transparent',
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
