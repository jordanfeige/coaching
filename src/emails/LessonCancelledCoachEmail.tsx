import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'
import EmailInfoRow from '@/emails/components/EmailInfoRow'

type LessonCancelledCoachEmailProps = {
  playerName: string
  date: string
  time: string
  sport: string
  dashboardUrl: string
}

export function LessonCancelledCoachEmail({ playerName, date, time, sport, dashboardUrl }: LessonCancelledCoachEmailProps) {
  return (
    <EmailLayout preview={`${playerName}'s ${sport} lesson has been cancelled`}>
      <Heading style={{ fontSize: 26, margin: '0 0 12px', color: emailStyles.text }}>Lesson cancelled</Heading>
      <Text style={{ display: 'inline-block', background: '#FEE2E2', color: '#B91C1C', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
        Cancelled
      </Text>
      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, margin: '18px 0' }}>
        <EmailInfoRow label="Player" value={playerName} />
        <EmailInfoRow label="Date" value={date} />
        <EmailInfoRow label="Time" value={time} />
        <EmailInfoRow label="Sport" value={sport} />
      </div>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        This slot is now available again. You can reschedule or open it to new bookings.
      </Text>
      <EmailButton href={dashboardUrl}>Manage your schedule →</EmailButton>
    </EmailLayout>
  )
}

export default LessonCancelledCoachEmail
