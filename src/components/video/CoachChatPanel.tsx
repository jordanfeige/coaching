'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_PROMPTS = [
  'What should I fix first?',
  'Explain this in beginner terms.',
  'Give me a 10-minute practice plan.',
  'What drill should I do before my next lesson?',
]

const SPORT_PROMPTS: Record<string, string[]> = {
  golf: [
    'How can I get more loft based on this swing?',
    'What is causing weak contact?',
    'How do I stop slicing it?',
  ],
  tennis: [
    'How do I create more topspin?',
    'Why am I late to contact?',
    'What should my footwork cue be?',
  ],
  pickleball: [
    'How do I stop popping the ball up?',
    'What should I fix at the kitchen?',
    'How can I improve my third shot?',
  ],
  basketball: [
    'How do I get a higher release?',
    'Why is my shot inconsistent?',
    'What should my elbow cue be?',
  ],
}

function renderInlineMarkdown(text: string) {
  const clean = text.replace(/`([^`]+)`/g, '$1')
  return clean.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    return <span key={index}>{part}</span>
  })
}

function CoachMessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim()
        if (!line) return null

        const heading = line.match(/^#{1,4}\s+(.+)$/)
        if (heading) {
          return (
            <p key={index} className="pt-1 font-heading text-sm font-semibold text-foreground">
              {renderInlineMarkdown(heading[1])}
            </p>
          )
        }

        const numbered = line.match(/^(\d+)\.\s+(.+)$/)
        if (numbered) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {numbered[1]}
              </span>
              <p>{renderInlineMarkdown(numbered[2])}</p>
            </div>
          )
        }

        const bullet = line.match(/^[-*]\s+(.+)$/)
        if (bullet) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
              <p>{renderInlineMarkdown(bullet[1])}</p>
            </div>
          )
        }

        const label = line.match(/^\**([^:*]{2,34}):\**\s+(.+)$/)
        if (label) {
          return (
            <p key={index}>
              <span className="font-semibold text-foreground">{label[1]}: </span>
              {renderInlineMarkdown(label[2])}
            </p>
          )
        }

        return <p key={index}>{renderInlineMarkdown(line)}</p>
      })}
    </div>
  )
}

export default function CoachChatPanel({
  videoId,
  lessonId,
  sport,
  disabled,
}: {
  videoId?: string | null
  lessonId?: string | null
  sport?: string | null
  disabled?: boolean
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const starters = useMemo(() => {
    const sportKey = (sport || '').toLowerCase()
    return [...(SPORT_PROMPTS[sportKey] || []), ...DEFAULT_PROMPTS].slice(0, 5)
  }, [sport])

  async function ask(question?: string) {
    const content = (question ?? input).trim()
    if (!content || loading || disabled) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, lessonId, messages: nextMessages }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Coach AI could not answer.')
      setMessages([...nextMessages, { role: 'assistant', content: String(payload.answer || '') }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coach AI could not answer.')
      setMessages(messages)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h4 className="font-heading text-sm font-semibold text-foreground">Ask Coach AI</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Ask follow-up questions about this specific analysis.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {starters.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => ask(prompt)}
              disabled={loading || disabled}
              className="rounded-full border border-primary/20 bg-primary/[0.04] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mb-3 max-h-[420px] space-y-4 overflow-y-auto rounded-2xl border border-border bg-muted/20 p-3">
          {messages.map((message, index) =>
            message.role === 'user' ? (
              <div key={index} className="ml-auto max-w-[85%]">
                <div className="rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ) : (
              <div key={index} className="flex items-start gap-2">
                <div className="mt-5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  AI
                </div>
                <div className="max-w-[92%]">
                  <p className="mb-1 pl-1 text-[11px] font-semibold text-muted-foreground">Coach AI</p>
                  <div className="rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm">
                    <CoachMessageContent content={message.content} />
                  </div>
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex items-start gap-2">
              <div className="mt-5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                AI
              </div>
              <div>
                <p className="mb-1 pl-1 text-[11px] font-semibold text-muted-foreground">Coach AI</p>
                <div className="rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  Thinking…
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={event => {
          event.preventDefault()
          ask()
        }}
      >
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask about this swing, drill, or analysis..."
          disabled={loading || disabled}
          className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        />
        <Button type="submit" disabled={loading || disabled || !input.trim()}>
          Ask
        </Button>
      </form>
    </div>
  )
}
