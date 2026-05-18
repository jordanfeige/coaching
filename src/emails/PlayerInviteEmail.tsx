import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'
import EmailInfoRow from '@/emails/components/EmailInfoRow'

type PlayerInviteEmailProps = {
  coachName: string
  sport: string
  inviteUrl: string
}

export function PlayerInviteEmail({ coachName, sport, inviteUrl }: PlayerInviteEmailProps) {
  return (
    <EmailLayout preview="Accept your invite to view lessons, drills, and AI coaching feedback">
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>You&apos;ve been invited</Heading>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        {coachName} has added you to Playvia — your coaching hub for lessons, drills, and AI technique analysis.
      </Text>
      <div style={{ background: '#E1F5EE', border: '1px solid #9FE1CB', borderRadius: 12, padding: 16, margin: '20px 0' }}>
        <EmailInfoRow label="Sport" value={sport} />
        <EmailInfoRow label="Coach" value={coachName} />
      </div>
      <EmailButton href={inviteUrl}>Accept invite & create account →</EmailButton>
      <Text style={{ fontSize: 12, color: emailStyles.textMuted, lineHeight: 1.6 }}>
        This invite link expires in 24 hours.
      </Text>
    </EmailLayout>
  )
}

export default PlayerInviteEmail
