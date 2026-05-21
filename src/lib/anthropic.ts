import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[anthropic] Missing ANTHROPIC_API_KEY — Ask Via will be unavailable')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

/** Claude Sonnet 4 — used for Ask Via and other coaching surfaces. */
export const CLAUDE_SONNET_MODEL = 'claude-sonnet-4-6'
