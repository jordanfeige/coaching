import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'
import EmailInfoRow from '@/emails/components/EmailInfoRow'

type LessonBookedCoachEmailProps = {
  playerName: string
  playerEmail: string
  date: string
  time: string
  duration: string
  sport: string
  skillLevel: string
  lessonUrl: string
}

export function LessonBookedCoachEmail(props: LessonBookedCoachEmailProps) {
  return (
    <EmailLayout preview={`${props.playerName} booked a ${props.duration}-minute ${props.sport} lesson`}>
      <Heading style={{ fontSize: 26, margin: '0 0 12px', color: emailStyles.text }}>New lesson booked</Heading>
      <Text style={{ display: 'inline-block', background: '#DBEAFE', color: '#1D4ED8', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
        New booking
      </Text>
      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, margin: '18px 0' }}>
        <EmailInfoRow label="Player" value={props.playerName} />
        <EmailInfoRow label="Email" value={props.playerEmail} />
        <EmailInfoRow label="Date" value={props.date} />
        <EmailInfoRow label="Time" value={props.time} />
        <EmailInfoRow label="Duration" value={`${props.duration} minutes`} />
        <EmailInfoRow label="Sport" value={props.sport} />
        <EmailInfoRow label="Skill level" value={props.skillLevel} />
      </div>
      <EmailButton href={props.lessonUrl}>View in dashboard →</EmailButton>
    </EmailLayout>
  )
}

export default LessonBookedCoachEmail
