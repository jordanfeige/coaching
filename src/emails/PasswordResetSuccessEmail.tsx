import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

type PasswordResetSuccessEmailProps = {
  name: string
}

export function PasswordResetSuccessEmail({ name }: PasswordResetSuccessEmailProps) {
  return (
    <EmailLayout preview="Your Playvia password was successfully updated">
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>Password changed</Heading>
      <div style={{ background: '#DCFCE7', borderRadius: 12, padding: 14, margin: '0 0 18px' }}>
        <Text style={{ fontSize: 14, color: '#166534', fontWeight: 700, margin: 0 }}>✓ Your password was successfully updated</Text>
      </div>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        {name ? `${name}, your` : 'Your'} Playvia account password has been changed. If you made this change, no further action is needed.
      </Text>
      <EmailButton href="https://playvia.studio/login">Sign in to Playvia →</EmailButton>
      <Text style={{ fontSize: 12, color: emailStyles.textMuted, lineHeight: 1.6, marginTop: 24 }}>
        If you didn&apos;t make this change, contact us immediately at support@playvia.studio
      </Text>
    </EmailLayout>
  )
}

export default PasswordResetSuccessEmail
