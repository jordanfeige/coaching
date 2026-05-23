import { jsonrepair } from 'jsonrepair'

/** Strip markdown fences and extract outermost JSON object. */
export function extractJsonObject(raw: string): string {
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace === -1) {
    throw new Error('No JSON object found in response')
  }

  if (lastBrace === -1 || lastBrace < firstBrace) {
    cleaned = cleaned.substring(firstBrace)
    let openBraces = 0
    let openBrackets = 0
    let inString = false
    let escape = false

    for (const char of cleaned) {
      if (escape) {
        escape = false
        continue
      }
      if (char === '\\' && inString) {
        escape = true
        continue
      }
      if (char === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (char === '{') openBraces++
      if (char === '}') openBraces--
      if (char === '[') openBrackets++
      if (char === ']') openBrackets--
    }

    cleaned += ']'.repeat(Math.max(0, openBrackets))
    cleaned += '}'.repeat(Math.max(0, openBraces))
  } else {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }

  return cleaned
}

function stripTrailingCommas(json: string): string {
  return json.replace(/,(\s*[}\]])/g, '$1')
}

export class GeminiJsonParseError extends Error {
  readonly rawPreview: string

  constructor(message: string, raw: string) {
    super(message)
    this.name = 'GeminiJsonParseError'
    this.rawPreview = raw.length > 4000 ? `${raw.slice(0, 4000)}…` : raw
  }
}

/**
 * Parse JSON from Gemini (including responseMimeType: application/json).
 * Gemini often returns trailing commas, unescaped newlines in strings, or truncated output.
 */
export function parseGeminiJson<T>(raw: string): T {
  const extracted = extractJsonObject(raw)
  const strategies: Array<{ name: string; text: string }> = [
    { name: 'direct', text: extracted },
    { name: 'trailing_commas', text: stripTrailingCommas(extracted) },
    { name: 'jsonrepair', text: jsonrepair(extracted) },
    {
      name: 'jsonrepair+trailing_commas',
      text: stripTrailingCommas(jsonrepair(extracted)),
    },
  ]

  const errors: string[] = []

  for (const { name, text } of strategies) {
    try {
      return JSON.parse(text) as T
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${name}: ${msg}`)
    }
  }

  throw new GeminiJsonParseError(
    `Could not parse Gemini JSON (${errors.join('; ')})`,
    raw,
  )
}
