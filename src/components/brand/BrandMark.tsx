import Link from 'next/link'
import { cn } from '@/lib/utils'

export const BRAND_TAGLINE = 'AI Coaching for Modern Athletes'

type BrandMarkProps = {
  variant?: 'sidebar' | 'authHero' | 'authPanel' | 'public'
  size?: 'sm' | 'md'
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
    <span className="font-heading font-bold tracking-tight text-foreground">
      Play<span className="text-primary">via</span>
    </span>
  )

  const tagline = (
    <p className="font-medium leading-snug text-muted-foreground">{BRAND_TAGLINE}</p>
  )

  const inner =
    variant === 'authHero' ? (
      <>
        <p className="text-4xl leading-[1.05] md:text-5xl">{wordmark}</p>
        <div className="mt-4 max-w-lg text-base md:text-lg">{tagline}</div>
        {audience ? (
          <p className="mt-5 text-xs font-semibold tracking-wide text-primary uppercase">{audience}</p>
        ) : null}
      </>
    ) : variant === 'authPanel' ? (
      <>
        <p className="text-3xl leading-none">{wordmark}</p>
        <div className="mx-auto mt-3 max-w-xs text-xs leading-snug md:text-sm">{tagline}</div>
        {audience ? <p className="mt-3 text-xs font-medium text-muted-foreground">{audience}</p> : null}
      </>
    ) : variant === 'public' ? (
      <>
        <p className="text-3xl leading-none md:text-4xl">{wordmark}</p>
        <div className="mx-auto mt-3 max-w-sm text-sm md:text-base">{tagline}</div>
      </>
    ) : size === 'sm' ? (
      <>
        <p className="text-xl leading-none">{wordmark}</p>
      </>
    ) : size === 'md' ? (
      <>
        <p className="text-2xl leading-none">{wordmark}</p>
      </>
    ) : (
      <>
        <p className="text-[1.7rem] leading-[1.08] tracking-tight">{wordmark}</p>
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
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        {body}
      </Link>
    )
  }

  return body
}
