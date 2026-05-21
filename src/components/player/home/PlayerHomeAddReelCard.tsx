'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Video } from 'lucide-react'
import {
  INK,
  LINE,
  SUB,
  TEAL_DARK,
  TEAL_TINT,
  sans,
  serif,
} from '@/lib/player-home-tokens'

export default function PlayerHomeAddReelCard() {
  const router = useRouter()

  return (
    <section style={{ marginTop: 16 }}>
      <div
        style={{
          background: 'white',
          border: `1px solid ${LINE}`,
          borderRadius: 16,
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: TEAL_TINT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Video size={20} color={TEAL_DARK} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: serif,
                fontSize: 16,
                fontWeight: 700,
                color: INK,
                lineHeight: 1.3,
                letterSpacing: '-0.2px',
                marginBottom: 3,
              }}
            >
              Add to your Reels
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 12.5,
                color: SUB,
                lineHeight: 1.5,
              }}
            >
              Upload a video and Via will measure your joint angles, contact
              points, and full kinetic chain.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/player/reels')}
          style={{
            padding: '11px 20px',
            background: INK,
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          Reels <ArrowRight size={14} strokeWidth={2.2} />
        </button>
      </div>
    </section>
  )
}
