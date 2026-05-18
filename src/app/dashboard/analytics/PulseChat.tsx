'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MessageSquare, Minimize2, Send, X } from 'lucide-react'

const TEAL = 'hsl(168,62%,36%)'
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const WARM_BG = 'hsl(40,20%,97%)'

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: PulseAction
}

type PulseAction = {
  type: string
  playerId?: string
  playerName?: string
  focus?: string
}

interface Props {
  rosterContext: unknown
}

const SUGGESTED_QUESTIONS = [
  'Who needs my attention most?',
  'Schedule a lesson with my worst performing player',
  'Build a drill plan for follow through issues',
  'Which player is closest to a breakthrough?',
  'Generate a session plan for my next group lesson',
  "Who hasn't been analyzed recently?",
]

export default function PulseChat({ rosterContext }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function parseAction(response: string): {
    text: string
    action: PulseAction | null
  } {
    const actionMatch = response.match(/\[ACTION:(.*?)\]/)
    if (!actionMatch) return { text: response, action: null }

    try {
      const action = JSON.parse(actionMatch[1]) as PulseAction
      const text = response.replace(/\[ACTION:.*?\]/, '').trim()
      return { text, action }
    } catch {
      return { text: response, action: null }
    }
  }

  function executeAction(action: PulseAction) {
    switch (action.type) {
      case 'schedule':
        router.push(`/dashboard/schedule?player=${action.playerId}`)
        break
      case 'drill':
        router.push(
          `/dashboard/players/${action.playerId}?tab=drills&focus=${encodeURIComponent(action.focus || '')}`,
        )
        break
      case 'viewPlayer':
        router.push(`/dashboard/players/${action.playerId}`)
        break
      case 'analyzeVideo':
        router.push(`/dashboard/video?player=${action.playerId}`)
        break
    }
  }

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [messages, open, minimized])

  async function sendMessage(text?: string) {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    setInput('')
    const userMessage: Message = { role: 'user', content: messageText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('/api/pulse-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          rosterContext,
        }),
      })
      const data = (await response.json()) as { response?: string }
      const { text, action } = parseAction(data.response || 'Sorry, I could not generate a response.')
      const assistantMessage: Message = {
        role: 'assistant',
        content: text,
        action: action || undefined,
      }
      setMessages(prev => [...prev, assistantMessage])
      if (minimized) setHasUnread(true)
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => {
            setOpen(true)
            setHasUnread(false)
          }}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: TEAL,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 100,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={event => {
            event.currentTarget.style.transform = 'scale(1.08)'
            event.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)'
          }}
          onMouseLeave={event => {
            event.currentTarget.style.transform = 'scale(1)'
            event.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'
          }}
          type="button"
          aria-label="Open coaching assistant"
        >
          <MessageSquare size={22} color="white" />
          {hasUnread && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#DC2626',
                border: '2px solid white',
              }}
            />
          )}
        </button>
      )}

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 'min(380px, calc(100vw - 32px))',
            height: minimized ? 56 : 'min(520px, calc(100vh - 48px))',
            borderRadius: 20,
            background: 'white',
            border: `1px solid ${BORDER}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'height 0.25s ease',
          }}
        >
          <div
            style={{
              background: TEAL,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
              cursor: minimized ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (minimized) {
                setMinimized(false)
                setHasUnread(false)
              }
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MessageSquare size={16} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
                Coaching Assistant
              </div>
              {!minimized && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                  Ask me anything about your roster
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={event => {
                  event.stopPropagation()
                  setMinimized(!minimized)
                  if (minimized) setHasUnread(false)
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 6,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                }}
                type="button"
                aria-label={minimized ? 'Expand chat' : 'Minimize chat'}
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 6,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                }}
                type="button"
                aria-label="Close chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: WARM_BG,
                }}
              >
                {messages.length === 0 && (
                  <div>
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px 12px 12px 4px',
                        background: 'white',
                        border: `1px solid ${BORDER}`,
                        fontSize: 13,
                        color: TEXT,
                        lineHeight: 1.5,
                        marginBottom: 12,
                      }}
                    >
                      Hi Coach! I have full context on your roster. Ask me anything:
                      drill ideas, who to focus on, session planning, or anything else.
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {SUGGESTED_QUESTIONS.map(question => (
                        <button
                          key={question}
                          onClick={() => sendMessage(question)}
                          style={{
                            fontSize: 11,
                            padding: '6px 10px',
                            borderRadius: 999,
                            border: `1px solid ${TEAL}`,
                            background: TEAL_LIGHT,
                            color: TEAL,
                            cursor: 'pointer',
                            fontFamily: 'Arial, sans-serif',
                            fontWeight: 500,
                            textAlign: 'left',
                          }}
                          type="button"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{ maxWidth: '85%' }}>
                      <div
                        style={{
                          padding: '10px 13px',
                          borderRadius:
                            message.role === 'user'
                              ? '12px 12px 4px 12px'
                              : '12px 12px 12px 4px',
                          background: message.role === 'user' ? TEAL : 'white',
                          border: message.role === 'user' ? 'none' : `1px solid ${BORDER}`,
                          fontSize: 13,
                          color: message.role === 'user' ? 'white' : TEXT,
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {message.content}
                      </div>
                      {message.action && (
                        <div style={{ marginTop: 8 }}>
                          <button
                            onClick={() => executeAction(message.action!)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 14px',
                              borderRadius: 10,
                              background: TEAL,
                              color: 'white',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'Arial, sans-serif',
                            }}
                            type="button"
                          >
                            {message.action.type === 'schedule' && '📅'}
                            {message.action.type === 'drill' && '🏋️'}
                            {message.action.type === 'viewPlayer' && '👤'}
                            {message.action.type === 'analyzeVideo' && '📹'}
                            {message.action.type === 'schedule' &&
                              `Schedule lesson with ${message.action.playerName}`}
                            {message.action.type === 'drill' &&
                              `Build drill plan for ${message.action.playerName}`}
                            {message.action.type === 'viewPlayer' &&
                              `View ${message.action.playerName}'s profile`}
                            {message.action.type === 'analyzeVideo' &&
                              `Analyze ${message.action.playerName}'s video`}
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px 12px 12px 4px',
                        background: 'white',
                        border: `1px solid ${BORDER}`,
                        display: 'flex',
                        gap: 4,
                        alignItems: 'center',
                      }}
                    >
                      {[0, 1, 2].map(index => (
                        <div
                          key={index}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: TEAL,
                            animation: `bounce 1.2s ease-in-out ${index * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderTop: `1px solid ${BORDER}`,
                  background: 'white',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your roster..."
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    fontSize: 13,
                    fontFamily: 'Arial, sans-serif',
                    outline: 'none',
                    color: TEXT,
                    background: WARM_BG,
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: input.trim() && !loading ? TEAL : BORDER,
                    border: 'none',
                    cursor: input.trim() && !loading ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                  type="button"
                  aria-label="Send message"
                >
                  <Send size={15} color="white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  )
}
