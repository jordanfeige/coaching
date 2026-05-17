'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ExtractedVideoFrame } from '@/lib/video-frames'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function FrameSelectionDialog({
  open,
  title,
  frames,
  suggestedIndices,
  saving,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  frames: ExtractedVideoFrame[]
  suggestedIndices: number[]
  saving?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (frames: ExtractedVideoFrame[], focusNote: string) => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const [focusNote, setFocusNote] = useState('')

  const suggestedSet = useMemo(() => new Set(suggestedIndices), [suggestedIndices])

  useEffect(() => {
    if (!open) return
    setSelected(suggestedIndices.length ? suggestedIndices : frames.slice(0, 4).map(frame => frame.index))
    setFocusNote('')
  }, [open, frames, suggestedIndices])

  function toggle(index: number) {
    setSelected(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index)
      return [...prev, index].sort((a, b) => a - b)
    })
  }

  const selectedFrames = frames.filter(frame => selected.includes(frame.index))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,920px)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="pr-8 text-lg">Choose frames to analyze</DialogTitle>
          <DialogDescription>
            {title ? `${title} · ` : ''}We scanned the full clip and preselected useful teaching moments. Adjust the selection before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-border bg-muted/25 p-3">
            <label className="text-sm font-semibold text-foreground" htmlFor="frame-focus-note">
              Optional focus for this analysis
            </label>
            <textarea
              id="frame-focus-note"
              value={focusNote}
              onChange={e => setFocusNote(e.target.value)}
              placeholder="Example: focus on contact point, footwork before the shot, or recovery after contact."
              className="mt-2 min-h-20 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {frames.map(frame => {
              const isSelected = selected.includes(frame.index)
              const isSuggested = suggestedSet.has(frame.index)
              return (
                <button
                  key={frame.index}
                  type="button"
                  onClick={() => toggle(frame.index)}
                  className={cn(
                    'overflow-hidden rounded-xl border bg-card text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={frame.dataUrl} alt={`Frame ${frame.index}`} className="aspect-video w-full object-cover" />
                    <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                      <Badge variant={isSelected ? 'default' : 'secondary'}>
                        {isSelected ? 'Selected' : 'Select'}
                      </Badge>
                      {isSuggested && <Badge variant="outline" className="bg-background/90">Suggested</Badge>}
                    </div>
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="text-sm font-semibold text-foreground">Frame {frame.index}</p>
                    <p className="text-xs text-muted-foreground">{frame.timestamp.toFixed(1)}s into the clip</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedFrames.length} frame{selectedFrames.length === 1 ? '' : 's'} selected. Choose 2-5 frames for the most useful feedback.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(selectedFrames, focusNote)}
              disabled={saving || selectedFrames.length === 0}
            >
              {saving ? 'Generating coach feedback...' : 'Save analysis'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
