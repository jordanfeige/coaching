import type { ViaCreateDrill } from '@/lib/via-drill'

export type ViaShowPlayer = {
  id: string
  name: string
  score?: number | null
  score_delta?: number | null
  subtitle?: string
  urgent?: boolean
  href: string
}

export type ViaShowPlayersPayload = {
  players: ViaShowPlayer[]
}

export type ViaShowRecruitingPayload = {
  name: string
  wtn?: number | null
  national_rank?: number | null
  target_division?: string | null
  grad_year?: number | null
  player_id?: string
  href: string
}

export type ViaUniversalParseResult = {
  response: string
  createDrill: ViaCreateDrill | null
  showPlayers: ViaShowPlayersPayload | null
  showRecruiting: ViaShowRecruitingPayload | null
  navigate: string | null
}

function parseJsonBlock(raw: string, startIndex: number): { json: string; endIndex: number } | null {
  if (raw[startIndex] !== '{') return null
  let depth = 0
  for (let i = startIndex; i < raw.length; i++) {
    if (raw[i] === '{') depth++
    else if (raw[i] === '}') {
      depth--
      if (depth === 0) {
        return { json: raw.slice(startIndex, i + 1), endIndex: i + 1 }
      }
    }
  }
  return null
}

export function parseViaUniversalOutput(raw: string): ViaUniversalParseResult {
  let text = raw
  let createDrill: ViaCreateDrill | null = null
  let showPlayers: ViaShowPlayersPayload | null = null
  let showRecruiting: ViaShowRecruitingPayload | null = null
  let navigate: string | null = null

  const actionRegex = /ACTION:([A-Z_]+):/g
  let match: RegExpExecArray | null
  const removals: Array<{ start: number; end: number }> = []

  while ((match = actionRegex.exec(raw)) !== null) {
    const actionType = match[1]
    const jsonStart = match.index + match[0].length
    const block = parseJsonBlock(raw, jsonStart)
    if (!block) continue

    removals.push({ start: match.index, end: block.endIndex })

    try {
      const payload = JSON.parse(block.json) as Record<string, unknown>
      switch (actionType) {
        case 'CREATE_DRILL':
          createDrill = {
            title: String(payload.title || 'Drill'),
            description: String(payload.description || ''),
            sets: Number(payload.sets) || 3,
            reps: Number(payload.reps) || 15,
            cue: String(payload.cue || ''),
            player_id: (payload.player_id as string) || null,
            issue: (payload.issue as string) || null,
          }
          break
        case 'SHOW_PLAYERS':
          showPlayers = payload as ViaShowPlayersPayload
          break
        case 'SHOW_RECRUITING':
          showRecruiting = payload as ViaShowRecruitingPayload
          break
        case 'NAVIGATE':
          if (typeof payload.path === 'string') navigate = payload.path
          break
      }
    } catch {
      // ignore malformed action JSON
    }
  }

  if (removals.length > 0) {
    let cleaned = ''
    let cursor = 0
    for (const { start, end } of removals.sort((a, b) => a.start - b.start)) {
      cleaned += raw.slice(cursor, start)
      cursor = end
    }
    cleaned += raw.slice(cursor)
    text = cleaned
  }

  // Legacy bracket actions from older prompts
  text = text
    .replace(/\[ACTION:\{[^}]+\}\]/g, '')
    .replace(/\[ACTION:[^\]]+\]/g, '')
    .trim()

  return {
    response: text,
    createDrill,
    showPlayers,
    showRecruiting,
    navigate,
  }
}
