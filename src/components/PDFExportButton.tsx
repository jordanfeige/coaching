'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Download, Loader, Mail } from 'lucide-react'
import type { AnalysisPDF } from '@/lib/generateAnalysisPDF'

type PDFModule = typeof import('@/lib/generateAnalysisPDF')

interface Props {
  analysis: unknown
  playerName: string
  sport: string
  shotType?: string
  overallScore: number
  playerEmail?: string
}

export default function PDFExportButton({
  analysis,
  playerName,
  sport,
  shotType,
  overallScore,
  playerEmail,
}: Props) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pdfModule, setPdfModule] = useState<PDFModule | null>(null)

  async function loadPDF() {
    if (pdfModule) return pdfModule
    const pdfExports = await import('@/lib/generateAnalysisPDF')
    setPdfModule(pdfExports)
    return pdfExports
  }

  const analyzedAt = format(new Date(), 'MMMM d, yyyy')
  const filename = `playvia-${sport}-analysis-${format(new Date(), 'yyyy-MM-dd')}.pdf`

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      const { AnalysisPDFDocument } = await loadPDF()
      const { pdf } = await import('@react-pdf/renderer')
      const blob = await pdf(
        <AnalysisPDFDocument
          analysis={analysis as AnalysisPDF}
          playerName={playerName}
          sport={sport}
          shotType={shotType}
          overallScore={overallScore}
          analyzedAt={analyzedAt}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download PDF:', error)
    } finally {
      setDownloading(false)
    }
  }

  async function handleEmailPDF() {
    if (!playerEmail) return
    setSending(true)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analysis_pdf',
          to: playerEmail,
          playerName,
          sport,
          shotType,
          overallScore,
          analyzedAt,
          analysis,
        }),
      })

      if (!response.ok) {
        throw new Error('Email request failed')
      }

      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (error) {
      console.error('Failed to send PDF email:', error)
    } finally {
      setSending(false)
    }
  }

  const btnStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'Arial, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        onClick={handleDownloadPDF}
        disabled={downloading}
        style={{
          ...btnStyle,
          background: 'white',
          border: '1px solid hsl(30,10%,88%)',
          color: 'hsl(220,20%,15%)',
          opacity: downloading ? 0.7 : 1,
        }}
        type="button"
      >
        {downloading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
        {downloading ? 'Preparing PDF...' : 'Download PDF'}
      </button>

      {playerEmail && (
        <button
          onClick={handleEmailPDF}
          disabled={sending || sent}
          style={{
            ...btnStyle,
            background: sent ? 'hsl(168,62%,95%)' : 'hsl(168,62%,36%)',
            border: '1px solid hsl(168,62%,36%)',
            color: sent ? 'hsl(168,62%,36%)' : 'white',
            opacity: sending ? 0.75 : 1,
          }}
          type="button"
        >
          {sending ? <Loader size={14} className="animate-spin" /> : <Mail size={14} />}
          {sent ? 'Sent!' : sending ? 'Sending...' : `Email to ${playerEmail.split('@')[0]}`}
        </button>
      )}
    </div>
  )
}
