'use client'

import { useMemo, useState } from 'react'
import { Send, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type FeedbackRating = 'positive' | 'negative'

interface Props {
  sessionId?: string
  feedbackType: 'analysis' | 'chat'
  sport?: string
  shotType?: string
  fullAnalysis?: unknown
  chatMessage?: string
  chatResponse?: string
  size?: 'sm' | 'md'
}

const analysisOptions = [
  'Not specific enough',
  'Measurements seem wrong',
  'Missed the main issue',
  'Drills not helpful',
  'Too generic',
  'Wrong sport technique',
]

const chatOptions = ['Not helpful', 'Incorrect information', 'Too vague', 'Off topic']

export default function FeedbackButtons({
  sessionId,
  feedbackType,
  sport,
  shotType,
  fullAnalysis,
  chatMessage,
  chatResponse,
  size = 'md',
}: Props) {
  const [rating, setRating] = useState<FeedbackRating | null>(null)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const iconSize = size === 'sm' ? 14 : 16
  const btnPad = size === 'sm' ? '4px 8px' : '6px 12px'
  const options = feedbackType === 'analysis' ? analysisOptions : chatOptions

  async function submitFeedback(selectedRating: FeedbackRating, feedbackComment?: string) {
    setSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase.from('analysis_feedback').insert({
        user_id: user.id,
        session_id: sessionId || null,
        feedback_type: feedbackType,
        rating: selectedRating,
        comment: feedbackComment || null,
        sport: sport || null,
        shot_type: shotType || null,
        full_analysis: fullAnalysis || null,
        chat_message: chatMessage || null,
        chat_response: chatResponse || null,
      })

      if (error) throw error
      setSubmitted(true)
      setShowComment(false)
    } catch (error) {
      console.error('Feedback submit failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleThumbsUp() {
    setRating('positive')
    await submitFeedback('positive')
  }

  function handleThumbsDown() {
    setRating('negative')
    setShowComment(true)
  }

  async function handleCommentSubmit() {
    await submitFeedback('negative', comment)
  }

  async function handleCommentSkip() {
    await submitFeedback('negative')
  }

  function addQuickComment(option: string) {
    setComment(prev => (prev ? `${prev}, ${option}` : option))
  }

  if (submitted) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'hsl(220,10%,55%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {rating === 'positive' ? (
          <>
            <span style={{ color: 'hsl(168,62%,36%)' }}>✓</span> Thanks for the feedback!
          </>
        ) : (
          <>
            <span style={{ color: 'hsl(168,62%,36%)' }}>✓</span> Got it — we&apos;ll improve this.
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {!showComment && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'hsl(220,10%,55%)' }}>
            {feedbackType === 'analysis' ? 'Helpful?' : 'Good response?'}
          </span>
          <button
            type="button"
            onClick={handleThumbsUp}
            disabled={submitting}
            title="This was helpful"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: btnPad,
              borderRadius: 8,
              border: `1px solid ${rating === 'positive' ? 'hsl(168,62%,36%)' : 'hsl(30,10%,88%)'}`,
              background: rating === 'positive' ? 'hsl(168,62%,95%)' : 'white',
              color: rating === 'positive' ? 'hsl(168,62%,36%)' : 'hsl(220,10%,55%)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <ThumbsUp size={iconSize} />
          </button>
          <button
            type="button"
            onClick={handleThumbsDown}
            disabled={submitting}
            title="This needs improvement"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: btnPad,
              borderRadius: 8,
              border: `1px solid ${rating === 'negative' ? '#DC2626' : 'hsl(30,10%,88%)'}`,
              background: rating === 'negative' ? '#FEE2E2' : 'white',
              color: rating === 'negative' ? '#DC2626' : 'hsl(220,10%,55%)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <ThumbsDown size={iconSize} />
          </button>
        </div>
      )}

      {showComment && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 10,
            border: '1px solid hsl(30,10%,88%)',
            background: 'white',
            maxWidth: 380,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(220,20%,15%)' }}>
              What was wrong with this {feedbackType === 'analysis' ? 'analysis' : 'response'}?
            </span>
            <button
              type="button"
              onClick={() => setShowComment(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,10%,55%)' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {options.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => addQuickComment(option)}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 999,
                  border: '1px solid hsl(30,10%,88%)',
                  background: comment.includes(option) ? 'hsl(168,62%,95%)' : 'white',
                  color: comment.includes(option) ? 'hsl(168,62%,36%)' : 'hsl(220,10%,55%)',
                  cursor: 'pointer',
                }}
              >
                {option}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={event => setComment(event.target.value)}
            placeholder="Add more detail (optional)..."
            rows={2}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid hsl(30,10%,88%)',
              fontSize: 12,
              fontFamily: 'Arial, sans-serif',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              color: 'hsl(220,20%,15%)',
            }}
          />

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              type="button"
              onClick={handleCommentSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'hsl(168,62%,36%)',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Send size={12} />
              {submitting ? 'Sending...' : 'Send feedback'}
            </button>
            <button
              type="button"
              onClick={handleCommentSkip}
              disabled={submitting}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid hsl(30,10%,88%)',
                background: 'white',
                color: 'hsl(220,10%,55%)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
