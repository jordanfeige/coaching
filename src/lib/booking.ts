export type BookingTier = 'private' | 'group_2' | 'group_3_4'

export const BOOKING_TIERS: Array<{ value: BookingTier; label: string; maxPlayers: number; description: string }> = [
  { value: 'private', label: 'Private', maxPlayers: 1, description: '1 player' },
  { value: 'group_2', label: '2', maxPlayers: 2, description: 'Up to 2 players' },
  { value: 'group_3_4', label: '3-4', maxPlayers: 4, description: 'Up to 4 players' },
]

function normalizeTier(tier: string | null | undefined): string {
  if (tier === 'group_2_3') return 'group_2'
  if (tier === 'group_4_5') return 'group_3_4'
  return tier || 'private'
}

export function bookingTierConfig(tier: string | null | undefined) {
  const normalized = normalizeTier(tier)
  return BOOKING_TIERS.find(t => t.value === normalized) ?? BOOKING_TIERS[0]
}

export function bookingTierLabel(tier: string | null | undefined) {
  return bookingTierConfig(tier).label
}

export function capacityForTier(tier: string | null | undefined, fallback?: number | null) {
  if (typeof fallback === 'number' && fallback > 0) return fallback
  return bookingTierConfig(tier).maxPlayers
}
