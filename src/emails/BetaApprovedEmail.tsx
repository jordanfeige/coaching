import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

type BetaApprovedEmailProps = {
  name: string
  role: 'coach' | 'player'
}

export function BetaApprovedEmail({ name, role }: BetaApprovedEmailProps) {
  const isCoach = role === 'coach'

  return (
    <EmailLayout preview="Your Playvia beta access is approved">
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>You&apos;re approved</Heading>
      <div style={{ background: '#E1F5EE', borderRadius: 12, padding: 14, margin: '0 0 18px' }}>
        <Text style={{ fontSize: 14, color: emailStyles.teal, fontWeight: 700, margin: 0 }}>✓ Beta access granted</Text>
      </div>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        {isCoach
          ? `Welcome to the Playvia beta, ${name}. Your coaching dashboard is ready. Add your first player to get started.`
          : `Welcome to the Playvia beta, ${name}. You're in. You have 3 free AI analyses to get started — upload a short video of your technique and get a detailed coaching report in under 60 seconds.`}
      </Text>
      <EmailButton href={isCoach ? 'https://playvia.studio/dashboard' : 'https://playvia.studio/player'}>
        {isCoach ? 'Open your dashboard →' : 'Start analyzing →'}
      </EmailButton>
      <Text style={{ fontSize: 12, color: emailStyles.textMuted, lineHeight: 1.6, marginTop: 24 }}>
        You&apos;re one of our first beta users — your feedback shapes the product. Reply to this email anytime with thoughts.
      </Text>
    </EmailLayout>
  )
}

export default BetaApprovedEmail
