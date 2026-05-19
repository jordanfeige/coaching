export type ViaCreateDrill = {
  title: string
  description: string
  sets: number
  reps: number
  cue: string
  player_id?: string | null
  issue?: string | null
}

export function parseCreateDrill(raw: string): {
  text: string
  drill: ViaCreateDrill | null
} {
  const match = raw.match(/ACTION:CREATE_DRILL:(\{[\s\S]*\})/)
  if (!match) {
    return { text: raw, drill: null }
  }

  try {
    const drill = JSON.parse(match[1]) as ViaCreateDrill
    const text = raw.replace(/ACTION:CREATE_DRILL:\{[\s\S]*\}/, '').trim()
    return { text, drill }
  } catch {
    return { text: raw, drill: null }
  }
}
