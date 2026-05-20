export function formatContextForPrompt(context: string | undefined): string {
  if (!context) return ''
  const colon = context.indexOf(':')
  const type = colon >= 0 ? context.slice(0, colon) : context
  const id = colon >= 0 ? context.slice(colon + 1) : ''
  const labels: Record<string, string> = {
    quest: 'quest',
    category: 'Journey category',
    milestone: 'Road to Offer milestone',
    'player-card': 'Journey Rating',
    rating: 'Journey Rating',
  }
  return `\n\nUSER CONTEXT: The user is asking from the ${labels[type] ?? type} surface, specifically "${id}". Tailor your answer to this surface — be specific to that quest/category/milestone, not generic.`
}

export function formatContextChipLabel(context: string): string {
  const colon = context.indexOf(':')
  const type = colon >= 0 ? context.slice(0, colon) : context
  const id = colon >= 0 ? context.slice(colon + 1) : ''
  const typeLabels: Record<string, string> = {
    quest: 'Quest',
    category: 'Category',
    milestone: 'Milestone',
    'player-card': 'Rating',
    rating: 'Rating',
  }
  const idLabel = id
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
  return `Context: ${typeLabels[type] ?? type} · ${idLabel}`
}
