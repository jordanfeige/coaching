import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

type AnalysisCompleteEmailProps = {
  playerName: string
  sport: string
  shotType: string
  overallScore: number
  rating: string
  topIssue: string
  biggestWin: string
  analysisUrl: string
}

export function AnalysisCompleteEmail({ sport, shotType, overallScore, rating, topIssue, biggestWin, analysisUrl }: AnalysisCompleteEmailProps) {
  return (
    <EmailLayout preview="See your technique breakdown and coaching recommendations">
      <Heading style={{ fontSize: 26, margin: '0 0 20px', color: emailStyles.text }}>Your analysis is ready</Heading>
      <div style={{ background: emailStyles.teal, borderRadius: 16, padding: 24, textAlign: 'center', color: '#FFFFFF', marginBottom: 20 }}>
        <div style={{ fontSize: 56, lineHeight: 1, fontWeight: 800 }}>{overallScore}</div>
        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700 }}>Technique score</div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
          {rating} · {sport} {shotType}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, background: '#DCFCE7', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>Biggest win</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#14532D' }}>{biggestWin || 'You completed the analysis and have a clear baseline.'}</div>
        </div>
        <div style={{ flex: 1, background: '#FEF3C7', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 6 }}>Top focus area</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#78350F' }}>{topIssue}</div>
        </div>
      </div>
      <EmailButton href={analysisUrl}>View full analysis →</EmailButton>
      <Text style={{ fontSize: 12, color: emailStyles.textMuted, lineHeight: 1.6, marginTop: 20 }}>
        Your progress is being tracked. Keep uploading videos to watch your score improve over time.
      </Text>
    </EmailLayout>
  )
}

export default AnalysisCompleteEmail
