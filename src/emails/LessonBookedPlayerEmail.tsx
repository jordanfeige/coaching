import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'
import EmailInfoRow from '@/emails/components/EmailInfoRow'

type LessonBookedPlayerEmailProps = {
  playerName: string
  coachName: string
  date: string
  time: string
  duration: string
  sport: string
  lessonUrl: string
}

export function LessonBookedPlayerEmail({ coachName, date, time, duration, sport, lessonUrl }: LessonBookedPlayerEmailProps) {
  return (
    <EmailLayout preview={`Your ${sport} training session with ${coachName} is booked`}>
      <Heading style={{ fontSize: 26, margin: '0 0 12px', color: emailStyles.text }}>Training confirmed</Heading>
      <Text style={{ display: 'inline-block', background: '#DCFCE7', color: '#166534', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
        ✓ Confirmed
      </Text>
      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, margin: '18px 0' }}>
        <EmailInfoRow label="Date" value={date} />
        <EmailInfoRow label="Time" value={time} />
        <EmailInfoRow label="Duration" value={`${duration} minutes`} />
        <EmailInfoRow label="Coach" value={coachName} />
        <EmailInfoRow label="Sport" value={sport} />
      </div>
      <EmailButton href={lessonUrl}>View training details →</EmailButton>
      <div style={{ background: '#E1F5EE', borderRadius: 12, padding: 14, marginTop: 18 }}>
        <Text style={{ fontSize: 13, lineHeight: 1.5, color: emailStyles.teal, margin: 0 }}>
          Tip: Upload a practice video before your training session so your coach can review your technique in advance.
        </Text>
      </div>
    </EmailLayout>
  )
}

export default LessonBookedPlayerEmail
