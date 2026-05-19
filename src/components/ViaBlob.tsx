'use client'

import { useRef } from 'react'

interface Props {
  size?: number
  thinking?: boolean
  color?: string
}

export default function ViaBlob({
  size = 36,
  thinking = false,
  color = 'hsl(168,62%,36%)',
}: Props) {
  const blobRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <div
        ref={blobRef}
        style={{
          width: size,
          height: size,
          background: color,
          animation: thinking ? 'viaMorphFast 1.5s ease-in-out infinite' : 'viaMorph 4s ease-in-out infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          ref={innerRef}
          style={{
            width: size * 0.5,
            height: size * 0.5,
            background: 'rgba(255,255,255,0.25)',
            animation: thinking
              ? 'viaMorphFast 1.2s ease-in-out infinite reverse'
              : 'viaMorph 3s ease-in-out infinite reverse',
          }}
        />
      </div>

      {thinking && (
        <>
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: -4,
              width: size + 8,
              height: size + 8,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              animation: 'viaRing 1.5s ease-out infinite',
              opacity: 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              width: size + 16,
              height: size + 16,
              borderRadius: '50%',
              border: `1.5px solid ${color}`,
              animation: 'viaRing 1.5s ease-out 0.4s infinite',
              opacity: 0,
            }}
          />
        </>
      )}

      <style>{`
        @keyframes viaMorph {
          0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25%  { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          50%  { border-radius: 50% 60% 30% 60% / 30% 40% 60% 50%; }
          75%  { border-radius: 40% 30% 60% 50% / 60% 70% 30% 40%; }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        @keyframes viaMorphFast {
          0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25%  { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          50%  { border-radius: 50% 60% 30% 60% / 30% 40% 60% 50%; }
          75%  { border-radius: 40% 30% 60% 50% / 60% 70% 30% 40%; }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        @keyframes viaRing {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
