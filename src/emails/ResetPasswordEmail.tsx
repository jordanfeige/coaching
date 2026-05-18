import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

export const subject = 'Reset your Playvia password'
export const preview = 'Click to set a new password for your account'

export function ResetPasswordEmail() {
  return (
    <EmailLayout preview={preview}>
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>Reset your password</Heading>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        We received a request to reset your Playvia password. Click below to set a new one. This link expires in 1 hour.
      </Text>
      <EmailButton href="{{ .ConfirmationURL }}">Reset my password →</EmailButton>
      <Text style={{ fontSize: 12, color: emailStyles.textMuted, lineHeight: 1.6, marginTop: 24 }}>
        If you didn&apos;t request a password reset, you can safely ignore this email. Your password won&apos;t change.
      </Text>
    </EmailLayout>
  )
}

export default ResetPasswordEmail
