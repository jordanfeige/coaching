'use client'

import type { CSSProperties } from 'react'

interface Props {
  size?: number
  thinking?: boolean
  color?: string
  className?: string
  style?: CSSProperties
}

export default function ViaBlob({
  size = 36,
  thinking = false,
  color = 'hsl(168,62%,36%)',
  className,
  style,
}: Props) {
  const outerAnim = thinking
    ? 'viaLava1 1.8s ease-in-out infinite, viaFloatBlob 3s ease-in-out infinite'
    : 'viaLava1 5s ease-in-out infinite, viaFloatBlob 7s ease-in-out infinite'
  const innerAnim = thinking
    ? 'viaLava2 1.35s ease-in-out infinite'
    : 'viaLava2 4s ease-in-out infinite'
  const coreAnim = thinking
    ? 'viaLava3 1.1s ease-in-out infinite'
    : 'viaLava3 3s ease-in-out infinite'
  const sat1Anim = thinking
    ? 'viaLava1 3s ease-in-out infinite, viaOrbDrift 5s ease-in-out infinite'
    : 'viaLava1 6s ease-in-out infinite, viaOrbDrift 9s ease-in-out infinite'
  const sat2Anim = thinking
    ? 'viaLava2 4s ease-in-out infinite, viaOrbDrift2 6s ease-in-out infinite'
    : 'viaLava2 5s ease-in-out infinite, viaOrbDrift2 11s ease-in-out infinite'

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        className="via-blob-pulse-ring-1"
        style={{
          position: 'absolute',
          width: size * 1.45,
          height: size * 1.45,
          borderRadius: '50%',
          border: '1px solid rgba(29,158,117,0.15)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="via-blob-pulse-ring-2"
        style={{
          position: 'absolute',
          width: size * 1.2,
          height: size * 1.2,
          borderRadius: '50%',
          border: '1px solid rgba(29,158,117,0.2)',
          pointerEvents: 'none',
        }}
      />

      {thinking && (
        <>
          <div
            style={{
              position: 'absolute',
              width: size * 1.55,
              height: size * 1.55,
              borderRadius: '50%',
              border: `1.5px solid ${color}`,
              animation: 'viaThinkingRing 1.6s ease-out infinite',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: size * 1.95,
              height: size * 1.95,
              borderRadius: '50%',
              border: `1px solid ${color}`,
              animation: 'viaThinkingRing 1.6s ease-out 0.35s infinite',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      <div
        className="via-blob-sat-1"
        style={{
          position: 'absolute',
          width: size * 0.3,
          height: size * 0.3,
          background: 'rgba(29,158,117,0.18)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '0.5px solid rgba(255,255,255,0.2)',
          top: -4,
          right: 4,
          pointerEvents: 'none',
          animation: sat1Anim,
        }}
      />
      <div
        className="via-blob-sat-2"
        style={{
          position: 'absolute',
          width: size * 0.22,
          height: size * 0.22,
          background: 'rgba(29,158,117,0.12)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '0.5px solid rgba(255,255,255,0.15)',
          bottom: 4,
          left: -4,
          pointerEvents: 'none',
          animation: sat2Anim,
        }}
      />

      <div
        className="via-blob-outer"
        style={{
          width: size,
          height: size,
          background: 'rgba(240,250,246,0.55)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '0.5px solid rgba(255,255,255,0.6)',
          boxShadow:
            '0 8px 32px rgba(29,158,117,0.15), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(29,158,117,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: outerAnim,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '60%',
            height: '60%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
        <div
          className="via-blob-inner"
          style={{
            width: size * 0.52,
            height: size * 0.52,
            background: `linear-gradient(135deg, ${color} 0%, hsl(168,74%,18%) 100%)`,
            boxShadow: '0 0 24px rgba(29,158,117,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: innerAnim,
          }}
        >
          <div
            className="via-blob-core"
            style={{
              width: size * 0.24,
              height: size * 0.24,
              background: 'rgba(255,255,255,0.28)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
              animation: coreAnim,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes viaLava1 {
          0%   { border-radius: 62% 38% 46% 54% / 60% 44% 56% 40%; }
          25%  { border-radius: 40% 60% 54% 46% / 48% 62% 38% 52%; }
          50%  { border-radius: 54% 46% 38% 62% / 56% 40% 60% 44%; }
          75%  { border-radius: 46% 54% 62% 38% / 44% 56% 42% 58%; }
          100% { border-radius: 62% 38% 46% 54% / 60% 44% 56% 40%; }
        }
        @keyframes viaLava2 {
          0%   { border-radius: 38% 62% 54% 46% / 44% 56% 44% 56%; }
          33%  { border-radius: 56% 44% 40% 60% / 60% 40% 58% 42%; }
          66%  { border-radius: 44% 56% 62% 38% / 38% 62% 46% 54%; }
          100% { border-radius: 38% 62% 54% 46% / 44% 56% 44% 56%; }
        }
        @keyframes viaLava3 {
          0%   { border-radius: 50% 50% 40% 60% / 55% 45% 55% 45%; }
          50%  { border-radius: 40% 60% 55% 45% / 45% 55% 45% 55%; }
          100% { border-radius: 50% 50% 40% 60% / 55% 45% 55% 45%; }
        }
        @keyframes viaFloatBlob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes viaOrbDrift {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(10px, -14px); }
          50%  { transform: translate(-8px, 10px); }
          75%  { transform: translate(12px, 5px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes viaOrbDrift2 {
          0%   { transform: translate(0, 0); }
          33%  { transform: translate(-12px, 8px); }
          66%  { transform: translate(8px, -10px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes viaPulseRing {
          0%, 100% { opacity: .12; transform: scale(1); }
          50%       { opacity: .28; transform: scale(1.06); }
        }
        @keyframes viaThinkingRing {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .via-blob-outer { }
        .via-blob-inner { }
        .via-blob-core { }
        .via-blob-sat-1 { }
        .via-blob-sat-2 { }
        .via-blob-pulse-ring-1 { animation: viaPulseRing 3s ease-in-out infinite; }
        .via-blob-pulse-ring-2 { animation: viaPulseRing 2.5s ease-in-out 0.4s infinite; }
      `}</style>
    </div>
  )
}
