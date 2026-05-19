/** Extract USTA player id (uaid) from a raw id or profile URL. */
export function parseUstaUaid(input: string): string {
  if (!input) return ''
  const trimmed = input.trim()

  if (/^\d+$/.test(trimmed)) return trimmed

  const decoded = decodeURIComponent(decodeURIComponent(trimmed))
  const match = decoded.match(/uaid[=:](\d+)/)
  if (match?.[1]) return match[1]

  const numMatch = trimmed.match(/(\d{8,12})/)
  return numMatch?.[1] || trimmed
}
