import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

export const subject = 'Confirm your Playvia account'
export const preview = 'One click to get your first AI coaching report'

export function ConfirmSignupEmail() {
  return (
    <EmailLayout preview={preview}>
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>Confirm your email</Heading>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        You&apos;re one step away. Click below to confirm your account and get your 3 free Via reels.
      </Text>
      <EmailButton href="{{ .ConfirmationURL }}">Confirm my account →</EmailButton>
      <Text style={{ fontSize: 13, color: emailStyles.textMuted, margin: '12px 0 0' }}>
        3 free reels included · No credit card required
      </Text>
      <Text style={{ fontSize: 12, color: emailStyles.textMuted, lineHeight: 1.6, marginTop: 24 }}>
        If you didn&apos;t create a Playvia account, ignore this email.
      </Text>
    </EmailLayout>
  )
}

export default ConfirmSignupEmail
