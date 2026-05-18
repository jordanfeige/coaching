import { Heading } from '@react-email/heading'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'
import EmailInfoRow from '@/emails/components/EmailInfoRow'

type LessonRescheduledCoachEmailProps = {
  playerName: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
  sport: string
  lessonUrl: string
}

export function LessonRescheduledCoachEmail(props: LessonRescheduledCoachEmailProps) {
  return (
    <EmailLayout preview={`${props.playerName}'s lesson moved to ${props.newDate} at ${props.newTime}`}>
      <Heading style={{ fontSize: 26, margin: '0 0 12px', color: emailStyles.text }}>Lesson rescheduled</Heading>
      <div style={{ display: 'inline-block', background: '#FEF3C7', color: '#B45309', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
        Rescheduled
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 12, background: '#F9FAFB', color: emailStyles.textMuted, textDecoration: 'line-through' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Was</div>
          <div style={{ fontSize: 14 }}>{props.oldDate}</div>
          <div style={{ fontSize: 14 }}>{props.oldTime}</div>
        </div>
        <div style={{ color: emailStyles.teal, fontWeight: 700 }}>→</div>
        <div style={{ flex: 1, padding: 14, borderRadius: 12, background: '#E1F5EE', color: emailStyles.teal }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Now</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{props.newDate}</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{props.newTime}</div>
        </div>
      </div>
      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, margin: '18px 0' }}>
        <EmailInfoRow label="Player" value={props.playerName} />
        <EmailInfoRow label="Sport" value={props.sport} />
      </div>
      <EmailButton href={props.lessonUrl}>View in dashboard →</EmailButton>
    </EmailLayout>
  )
}

export default LessonRescheduledCoachEmail
