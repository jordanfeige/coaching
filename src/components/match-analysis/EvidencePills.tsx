'use client'

import { brand } from '@/lib/brand'
import { itemEvidence } from '@/lib/match-analysis/evidence'

type EvidenceItem = {
  evidence?: string[]
  timestamps?: string[]
}

export function EvidencePills({
  item,
  style,
}: {
  item: EvidenceItem
  style?: React.CSSProperties
}) {
  const refs = itemEvidence(item)
  if (refs.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
        ...style,
      }}
    >
      {refs.map(ref => (
        <span
          key={ref}
          style={{
            fontSize: 11,
            padding: '5px 10px',
            borderRadius: 8,
            background: brand.lineSoft,
            color: brand.sub,
            lineHeight: 1.35,
            maxWidth: '100%',
          }}
        >
          {ref}
        </span>
      ))}
    </div>
  )
}
