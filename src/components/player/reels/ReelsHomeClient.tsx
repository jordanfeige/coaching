'use client'

import { Suspense, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload } from 'lucide-react'
import { brand } from '@/lib/brand'
import { setPendingReelVideoFile } from '@/lib/pending-reel'
import { ReelsRecordModal } from '@/components/player/reels/ReelsRecordModal'
import { ReelsSubTabs, useReelsActiveTab } from '@/components/player/reels/ReelsSubTabs'
import {
  ReelsLandingClient,
  type ReelSummary,
} from '@/components/player/reels/ReelsLandingClient'
import { MatchFilmTab } from '@/components/player/reels/MatchFilmTab'

type Props = {
  recentReels: ReelSummary[]
  hasAnyReels: boolean
  filmRoomEnabled: boolean
}

function ReelsHomeInner({ recentReels, hasAnyReels, filmRoomEnabled }: Props) {
  const activeTab = useReelsActiveTab(filmRoomEnabled)
  const [recordOpen, setRecordOpen] = useState(false)
  const router = useRouter()
  const uploadRef = useRef<HTMLInputElement>(null)

  return (
    <div
      style={{
        padding: '14px 16px 48px',
        maxWidth: 880,
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 24,
            fontWeight: 500,
            margin: 0,
            color: brand.ink,
          }}
        >
          Reels
        </h1>
        {activeTab === 'practice' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 99,
                cursor: 'pointer',
                background: brand.card,
                color: brand.sub,
                border: `0.5px solid ${brand.line}`,
              }}
            >
              <Upload size={14} aria-hidden />
              Upload
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                setPendingReelVideoFile(file)
                router.push('/player/reels/new')
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => setRecordOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 99,
                cursor: 'pointer',
                background: brand.tealDarkHex,
                color: 'white',
                border: `0.5px solid ${brand.tealDarkHex}`,
              }}
            >
              <Camera size={14} aria-hidden />
              Record
            </button>
          </div>
        )}
      </header>

      {filmRoomEnabled && <ReelsSubTabs showMatchFilm />}

      {activeTab === 'practice' ? (
        <ReelsLandingClient
          recentReels={recentReels}
          hasAnyReels={hasAnyReels}
          embedded
        />
      ) : filmRoomEnabled ? (
        <MatchFilmTab />
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: brand.muted,
            fontSize: 14,
          }}
        >
          Match Film is coming soon.
        </div>
      )}

      {recordOpen && (
        <ReelsRecordModal onClose={() => setRecordOpen(false)} />
      )}
    </div>
  )
}

export function ReelsHomeClient(props: Props) {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ReelsHomeInner {...props} />
    </Suspense>
  )
}
