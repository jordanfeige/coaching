import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'
import EmailInfoRow from '@/emails/components/EmailInfoRow'

type LessonCancelledPlayerEmailProps = {
  playerName: string
  coachName: string
  date: string
  time: string
  sport: string
  reason?: string
  bookingUrl: string
}

export function LessonCancelledPlayerEmail({ coachName, date, time, sport, reason, bookingUrl }: LessonCancelledPlayerEmailProps) {
  return (
    <EmailLayout preview={`Your ${sport} lesson on ${date} has been cancelled`}>
      <Heading style={{ fontSize: 26, margin: '0 0 12px', color: emailStyles.text }}>Lesson cancelled</Heading>
      <Text style={{ display: 'inline-block', background: '#FEE2E2', color: '#B91C1C', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
        Cancelled
      </Text>
      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, margin: '18px 0' }}>
        <EmailInfoRow label="Date" value={date} />
        <EmailInfoRow label="Time" value={time} />
        <EmailInfoRow label="Sport" value={sport} />
        <EmailInfoRow label="Coach" value={coachName} />
        {reason ? <EmailInfoRow label="Reason" value={reason} /> : null}
      </div>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        We&apos;re sorry for the inconvenience. Book a new time that works for you.
      </Text>
      <EmailButton href={bookingUrl}>Book a new lesson →</EmailButton>
    </EmailLayout>
  )
}

export default LessonCancelledPlayerEmail
