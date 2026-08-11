import Link from 'next/link'
import { cn } from '@/lib/utils'

export const BRAND_TAGLINE = 'Sports Intelligence Platform'

type BrandMarkProps = {
  variant?: 'sidebar' | 'authHero' | 'authPanel' | 'public'
  size?: 'sm' | 'md' | 'lg'
  /** Shown under the tagline on compact layouts (e.g. “Player”). */
  audience?: string
  className?: string
  /** Wrap wordmark + tagline in a link (dashboard sidebars). */
  href?: string
}

/**
 * Playvia wordmark + tagline. “via” uses primary for a subtle mnemonic (pathway / forward motion).
 */
export function BrandMark({ variant = 'sidebar', size, audience, className, href }: BrandMarkProps) {
  const wordmark = (
    <span
      style={{
        fontFamily: 'var(--font-dm-serif), Georgia, serif',
        fontSize: 28,
        letterSpacing: '-.3px',
        lineHeight: 1,
      }}
    >
      <span style={{ fontStyle: 'normal' }}>Play</span>
      <span style={{ color: '#1D9E75', fontStyle: 'italic' }}>via</span>
    </span>
  )

  const tagline = (
    <p className="font-medium leading-snug text-muted-foreground">{BRAND_TAGLINE}</p>
  )

  const inner =
    variant === 'authHero' ? (
      <>
        <p className="leading-[1.05]">{wordmark}</p>
        <div className="mt-4 max-w-lg text-base md:text-lg">{tagline}</div>
        {audience ? (
          <p className="mt-5 text-xs font-semibold tracking-wide text-primary uppercase">{audience}</p>
        ) : null}
      </>
    ) : variant === 'authPanel' ? (
      <>
        <p className="leading-none">{wordmark}</p>
        <div className="mx-auto mt-3 max-w-xs text-xs leading-snug md:text-sm">{tagline}</div>
        {audience ? <p className="mt-3 text-xs font-medium text-muted-foreground">{audience}</p> : null}
      </>
    ) : variant === 'public' ? (
      <>
        <p className="leading-none">{wordmark}</p>
        <div className="mx-auto mt-3 max-w-sm text-sm md:text-base">{tagline}</div>
      </>
    ) : size === 'lg' ? (
      <>
        <p className="leading-none">{wordmark}</p>
        <div className="mx-auto mt-3 max-w-sm text-sm md:text-base">{tagline}</div>
      </>
    ) : size === 'sm' ? (
      <p className="leading-none">{wordmark}</p>
    ) : size === 'md' ? (
      <p className="leading-none">{wordmark}</p>
    ) : (
      <>
        <p className="leading-[1.08]">{wordmark}</p>
        <div className="mt-2.5 text-[11px] leading-snug sm:text-xs">{tagline}</div>
        {audience ? <p className="mt-2 text-xs font-semibold text-muted-foreground">{audience}</p> : null}
      </>
    )

  const body = <div className={cn(className)}>{inner}</div>

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          'block rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-95',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        {body}
      </Link>
    )
  }

  return body
}
