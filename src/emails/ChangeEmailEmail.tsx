import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

export const subject = 'Confirm your new email address'
export const preview = 'Click to confirm your new Playvia email'

export function ChangeEmailEmail() {
  return (
    <EmailLayout preview={preview}>
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>Confirm new email</Heading>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        You requested to change your Playvia email address. Click below to confirm this change.
      </Text>
      <EmailButton href="{{ .ConfirmationURL }}">Confirm new email →</EmailButton>
      <Text style={{ fontSize: 12, color: emailStyles.textMuted, lineHeight: 1.6, marginTop: 24 }}>
        If you didn&apos;t request this change, please reset your password immediately.
      </Text>
    </EmailLayout>
  )
}

export default ChangeEmailEmail
