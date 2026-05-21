'use client'

import { useEffect, useRef, useState } from 'react'
import { Lightbulb, Send, X } from 'lucide-react'
import ViaBlob from '@/components/ViaBlob'
import { useAskVia } from '@/components/player/ask-via/AskViaContext'

type Message = {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: string[]
}

type AskViaPanelProps = {
  onClose: () => void
}

const SUGGESTED_PROMPTS_BY_PAGE: Record<string, string[]> = {
  journey: [
    'Which gap should I fix first?',
    'What does D1 mid-major actually require?',
    'How am I improving compared to peers?',
  ],
  recruiting: [
    'Which colleges am I closest to?',
    'What does my projected UTR mean for recruiting?',
    'How many quality wins do I need this year?',
  ],
  training: [
    'What drills are due this week?',
    'What did my coach say in my last lesson?',
    'Why is coachability my lowest sub-score?',
  ],
  reels: [
    "What's my most recurring issue across reels?",
    'Tell me about my last analyzed reel',
    'How has my technique score trended?',
  ],
  home: [
    'What should I work on today?',
    "What's my biggest opportunity to improve?",
    'Summarize my recruiting picture',
  ],
  settings: [
    'What should I update in my profile?',
    'How is my UTR affecting my rating?',
    'Summarize my recruiting picture',
  ],
}

function prettifyToolName(name: string): string {
  const map: Record<string, string> = {
    get_rating_breakdown: 'your rating',
    get_trajectory: 'your trajectory',
    get_reels: 'your reels',
    get_reel_detail: 'this reel',
    get_match_history: 'your match history',
    get_quality_wins_summary: 'your quality wins',
    get_drills: 'your drills',
    get_lessons: 'your lessons',
    get_coach_info: 'your coach',
    get_college_matches: 'your college matches',
    get_road_to_offer: 'your road to offer',
    get_practice_streak: 'your practice streak',
  }
  return map[name] ?? name
}

export default function AskViaPanel({ onClose }: AskViaPanelProps) {
  const { pageContext, pendingPrompt, clearPendingPrompt } = useAskVia()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pendingSentRef = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeToolCall, isThinking])

  const suggestedPrompts =
    SUGGESTED_PROMPTS_BY_PAGE[pageContext] ?? SUGGESTED_PROMPTS_BY_PAGE.home

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)
    setIsThinking(true)

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      toolCalls: [],
    }
    setMessages([...newMessages, assistantMessage])

    try {
      const res = await fetch('/api/ask-via/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          pageContext,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Stream failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantText = ''
      const toolCalls: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const block of events) {
          const lines = block.split('\n')
          let eventName = ''
          let dataStr = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7)
            else if (line.startsWith('data: ')) dataStr = line.slice(6)
          }
          if (!eventName || !dataStr) continue

          try {
            const data = JSON.parse(dataStr) as Record<string, unknown>
            if (eventName === 'text_delta' && typeof data.text === 'string') {
              setIsThinking(false)
              assistantText += data.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: assistantText,
                  toolCalls: [...toolCalls],
                }
                return copy
              })
            } else if (
              eventName === 'tool_call_start' &&
              typeof data.name === 'string'
            ) {
              toolCalls.push(data.name)
              setActiveToolCall(data.name)
              setIsThinking(false)
            } else if (eventName === 'tool_call_end') {
              setActiveToolCall(null)
            } else if (eventName === 'thinking') {
              setIsThinking(Boolean(data.active))
            } else if (
              eventName === 'error' &&
              typeof data.message === 'string'
            ) {
              assistantText += `\n\nSomething went wrong: ${data.message}`
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: assistantText,
                }
                return copy
              })
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: 'Sorry, something went wrong. Try again.',
        }
        return copy
      })
    } finally {
      setIsStreaming(false)
      setIsThinking(false)
      setActiveToolCall(null)
    }
  }

  useEffect(() => {
    if (!pendingPrompt || pendingSentRef.current || isStreaming) return
    pendingSentRef.current = true
    void sendMessage(pendingPrompt)
    clearPendingPrompt()
  }, [pendingPrompt, isStreaming, clearPendingPrompt])

  function handleClose() {
    setMessages([])
    setInput('')
    pendingSentRef.current = false
    onClose()
  }

  return (
    <>
      <div
        role="presentation"
        onClick={handleClose}
        className="ask-via-backdrop lg:hidden"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.2)',
          zIndex: 35,
        }}
      />

      <aside
        className="ask-via-panel"
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 138px)',
          right: 16,
          width: 'calc(100vw - 32px)',
          maxWidth: 340,
          maxHeight: '70vh',
          background: 'white',
          borderRadius: 14,
          border: '0.5px solid rgba(0,0,0,0.1)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: '12px 14px',
            borderBottom: '0.5px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <ViaBlob size={26} thinking={isThinking || Boolean(activeToolCall)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: 13,
                fontWeight: 500,
                color: '#111',
              }}
            >
              Ask Via
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#888',
                fontStyle: 'italic',
              }}
            >
              Knows your profile · recruiting picture
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Ask Via"
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
          }}
        >
          {messages.length === 0 ? (
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: '#888',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Try asking
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                {suggestedPrompts.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    disabled={isStreaming}
                    style={{
                      fontSize: 12,
                      textAlign: 'left',
                      padding: '9px 11px',
                      background: '#FAFAF7',
                      borderRadius: 8,
                      color: '#444',
                      border: '0.5px solid rgba(0,0,0,0.04)',
                      cursor: isStreaming ? 'not-allowed' : 'pointer',
                      lineHeight: 1.4,
                      fontFamily: 'Georgia, serif',
                      fontStyle: 'italic',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                      opacity: isStreaming ? 0.6 : 1,
                    }}
                  >
                    <Lightbulb
                      size={13}
                      color="#0F6E56"
                      style={{ marginTop: 1, flexShrink: 0 }}
                      aria-hidden
                    />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems:
                      m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      padding: '9px 12px',
                      borderRadius: 12,
                      background: m.role === 'user' ? '#0A2A22' : '#FAFAF7',
                      color: m.role === 'user' ? 'white' : '#111',
                      maxWidth: '90%',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.content ||
                      (isStreaming && i === messages.length - 1
                        ? '…'
                        : '')}
                  </div>
                </div>
              ))}
              {(isThinking || activeToolCall) && (
                <div
                  style={{
                    fontSize: 11,
                    fontStyle: 'italic',
                    color: '#888',
                    fontFamily: 'Georgia, serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    className="ask-via-status-dot"
                    style={{
                      width: 4,
                      height: 4,
                      background: '#5DCAA5',
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                  {activeToolCall
                    ? `Looking up ${prettifyToolName(activeToolCall)}…`
                    : 'Via is thinking…'}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <footer
          style={{
            padding: '10px 12px',
            borderTop: '0.5px solid rgba(0,0,0,0.06)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: '#FAFAF7',
              borderRadius: 99,
              border: '0.5px solid rgba(0,0,0,0.08)',
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage(input)
                }
              }}
              placeholder={
                isStreaming ? '…' : 'Ask anything about your profile…'
              }
              disabled={isStreaming}
              aria-label="Message Ask Via"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                fontSize: 12,
                outline: 'none',
                color: '#111',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
              }}
            />
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={isStreaming || !input.trim()}
              aria-label="Send message"
              style={{
                width: 28,
                height: 28,
                background:
                  isStreaming || !input.trim()
                    ? 'rgba(0,0,0,0.15)'
                    : '#0A2A22',
                borderRadius: '50%',
                border: 'none',
                color: 'white',
                cursor:
                  isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send size={12} />
            </button>
          </div>
        </footer>
      </aside>

      <style>{`
        @keyframes askViaPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .ask-via-status-dot {
          animation: askViaPulse 1s ease-in-out infinite;
        }
        @media (min-width: 1024px) {
          .ask-via-panel {
            bottom: calc(env(safe-area-inset-bottom, 0px) + 88px) !important;
            right: 24px !important;
            width: 340px !important;
          }
        }
      `}</style>
    </>
  )
}
