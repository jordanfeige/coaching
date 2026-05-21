'use client'

interface PlayviaLoaderProps {
  size?: 'lg' | 'sm'
  caption?: string
  fullscreen?: boolean
}

export function PlayviaLoader({
  size = 'lg',
  caption,
  fullscreen = true,
}: PlayviaLoaderProps) {
  const wordmarkSize = size === 'lg' ? 42 : 24
  const dotSize = size === 'lg' ? 5 : 4
  const dotGap = size === 'lg' ? 5 : 4
  const marginTop = size === 'lg' ? 14 : 10

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : undefined,
        width: fullscreen ? undefined : '100%',
        minHeight: fullscreen ? undefined : 200,
        background: fullscreen ? '#F5F4F0' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: fullscreen ? 100 : undefined,
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          className="playvia-loader-wordmark"
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: wordmarkSize,
            fontWeight: 500,
            letterSpacing: '-1px',
            color: '#111',
            lineHeight: 1,
          }}
        >
          Play
          <span style={{ color: '#0F6E56', fontStyle: 'italic' }}>via</span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: dotGap,
            justifyContent: 'center',
            marginTop,
          }}
          aria-hidden
        >
          <span
            className="playvia-loader-dot"
            style={{
              width: dotSize,
              height: dotSize,
              animationDelay: '0s',
            }}
          />
          <span
            className="playvia-loader-dot"
            style={{
              width: dotSize,
              height: dotSize,
              animationDelay: '0.2s',
            }}
          />
          <span
            className="playvia-loader-dot"
            style={{
              width: dotSize,
              height: dotSize,
              animationDelay: '0.4s',
            }}
          />
        </div>

        {caption ? (
          <div
            style={{
              marginTop: 16,
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 13,
              fontStyle: 'italic',
              color: '#666',
              letterSpacing: '0.2px',
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PlayviaLoader
