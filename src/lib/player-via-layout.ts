/** Routes that render UniversalVia in page content (hide layout bar + panel on desktop). */
const EMBEDDED_UNIVERSAL_VIA_PREFIXES = [
  '/player/journey',
  '/player/training',
  '/player/reels',
  '/player/progress',
  '/player/settings',
] as const

/** Routes with their own Via UI (UniversalVia or ViaBar) — hide layout Ask Via bar. */
const OWN_VIA_CHROME_PREFIXES = [
  ...EMBEDDED_UNIVERSAL_VIA_PREFIXES,
  '/player/bulletin',
] as const

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function playerPageHasEmbeddedUniversalVia(pathname: string) {
  return EMBEDDED_UNIVERSAL_VIA_PREFIXES.some(p => matchesPrefix(pathname, p))
}

export function playerPageHidesLayoutViaChrome(pathname: string) {
  return OWN_VIA_CHROME_PREFIXES.some(p => matchesPrefix(pathname, p))
}
