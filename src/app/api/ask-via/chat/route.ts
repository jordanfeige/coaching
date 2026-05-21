import type Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { anthropic, CLAUDE_SONNET_MODEL } from '@/lib/anthropic'
import { runTool } from '@/lib/ask-via/handlers'
import { VIA_TOOLS, type ViaToolName } from '@/lib/ask-via/tools'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are Via, the AI coach inside Playvia — an AI-powered recruiting platform for junior tennis players.

You help players (ages 9-18) understand their recruiting picture: Journey rating, UTR trajectory, college matches, exposure score, training plan, and coaching relationship.

When the player asks about anything in their profile, USE THE TOOLS to fetch real data. Never make up numbers. If a tool returns no data or an error, say so honestly.

Tone: direct, encouraging, specific. Use concrete numbers. Be honest about gaps without being crushing. Keep answers brief (2-4 sentences typical); bullets for multi-part answers.

Workflow hints:
- Reels have player-chosen names (title/displayName in get_reels). Reference reels by name when answering; use get_reel_detail with reelId or reelName
- Coach: get_coach_info
- Past lesson notes: get_lessons with timeframe past
- Colleges: get_college_matches
- Training plan: get_drills with status assigned
- "What should I work on": get_road_to_offer + get_rating_breakdown

You cannot schedule lessons, message coaches, or change data — read-only.`

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function sendEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: string,
  data: unknown,
) {
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
  )
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('Ask Via is not configured', { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return new Response('No player', { status: 404 })
  }

  const body = (await req.json()) as {
    messages?: ChatMessage[]
    pageContext?: string
  }

  const messages = body.messages ?? []
  const pageContext = body.pageContext

  if (messages.length === 0) {
    return new Response('No messages', { status: 400 })
  }

  const contextPrefix = pageContext
    ? `(The player is on the ${pageContext} page in Playvia.)\n\n`
    : ''

  const initialMessages: Anthropic.Messages.MessageParam[] = messages.map(
    (m, i) => ({
      role: m.role,
      content:
        i === messages.length - 1 && m.role === 'user'
          ? contextPrefix + m.content
          : m.content,
    }),
  )

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      sendEvent(controller, encoder, 'thinking', { active: true })

      try {
        let conversationMessages = [...initialMessages]
        let iterationCount = 0
        const MAX_ITERATIONS = 5

        while (iterationCount < MAX_ITERATIONS) {
          iterationCount += 1

          const response = await anthropic.messages.create({
            model: CLAUDE_SONNET_MODEL,
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools: VIA_TOOLS,
            messages: conversationMessages,
            stream: true,
          })

          let currentTextBlock = ''
          let currentToolUse: {
            id: string
            name: string
            input: string
          } | null = null
          let finalStopReason: Anthropic.Messages.StopReason | null = null
          const assistantContent: Anthropic.Messages.ContentBlockParam[] = []

          for await (const chunk of response) {
            if (chunk.type === 'content_block_start') {
              if (chunk.content_block.type === 'text') {
                currentTextBlock = ''
                sendEvent(controller, encoder, 'thinking', { active: false })
              } else if (chunk.content_block.type === 'tool_use') {
                currentToolUse = {
                  id: chunk.content_block.id,
                  name: chunk.content_block.name,
                  input: '',
                }
                sendEvent(controller, encoder, 'tool_call_start', {
                  name: chunk.content_block.name,
                })
              }
            } else if (chunk.type === 'content_block_delta') {
              if (chunk.delta.type === 'text_delta') {
                currentTextBlock += chunk.delta.text
                sendEvent(controller, encoder, 'text_delta', {
                  text: chunk.delta.text,
                })
              } else if (
                chunk.delta.type === 'input_json_delta' &&
                currentToolUse
              ) {
                currentToolUse.input += chunk.delta.partial_json
              }
            } else if (chunk.type === 'content_block_stop') {
              if (currentTextBlock) {
                assistantContent.push({
                  type: 'text',
                  text: currentTextBlock,
                })
                currentTextBlock = ''
              }
              if (currentToolUse) {
                let parsedInput: Record<string, unknown> = {}
                try {
                  parsedInput = currentToolUse.input
                    ? (JSON.parse(currentToolUse.input) as Record<
                        string,
                        unknown
                      >)
                    : {}
                } catch {
                  parsedInput = {}
                }
                assistantContent.push({
                  type: 'tool_use',
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: parsedInput,
                })
                currentToolUse = null
              }
            } else if (chunk.type === 'message_delta') {
              if (chunk.delta.stop_reason) {
                finalStopReason = chunk.delta.stop_reason
              }
            }
          }

          if (finalStopReason !== 'tool_use') {
            break
          }

          conversationMessages.push({
            role: 'assistant',
            content: assistantContent,
          })

          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
          for (const block of assistantContent) {
            if (block.type === 'tool_use') {
              const result = await runTool(
                block.name as ViaToolName,
                (block.input ?? {}) as Record<string, unknown>,
                playerId,
                supabase,
              )
              sendEvent(controller, encoder, 'tool_call_end', {
                name: block.name,
              })
              sendEvent(controller, encoder, 'thinking', { active: true })
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              })
            }
          }

          conversationMessages.push({ role: 'user', content: toolResults })
        }

        sendEvent(controller, encoder, 'thinking', { active: false })
        sendEvent(controller, encoder, 'done', {})
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unknown error'
        console.error('[ask-via]', err)
        sendEvent(controller, encoder, 'error', { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
