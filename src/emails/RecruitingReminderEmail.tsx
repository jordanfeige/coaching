import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

type Props = {
  firstName: string
  recruitingUrl: string
}

export function RecruitingReminderEmail({
  firstName,
  recruitingUrl,
}: Props) {
  return (
    <EmailLayout preview="Complete your Playvia recruiting profile">
      <Text style={{ color: emailStyles.textSecondary, marginTop: 0 }}>
        Hi {firstName},
      </Text>
      <Text style={{ color: emailStyles.textSecondary }}>
        Your coach is ready to build your college recruiting roadmap on Playvia.
        Via needs your goals, academics, and preferences — it takes about 3
        minutes.
      </Text>
      <EmailButton href={recruitingUrl}>Set up recruiting</EmailButton>
    </EmailLayout>
  )
}
