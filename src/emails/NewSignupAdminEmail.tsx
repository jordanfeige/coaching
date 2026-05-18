import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

type NewSignupAdminEmailProps = {
  name: string
  email: string
  role: 'coach' | 'player'
  sport?: string
  signedUpAt: string
  approveUrl: string
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '9px 0',
        borderBottom: '1px solid #E5E7EB',
        fontSize: 14,
      }}
    >
      <span style={{ color: emailStyles.textSecondary }}>{label}</span>
      <span style={{ color: emailStyles.text, fontWeight: 600, textAlign: 'right' }}>{children}</span>
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'teal' | 'amber' }) {
  const styles =
    tone === 'teal'
      ? { background: '#E1F5EE', color: emailStyles.teal, border: '1px solid #9FE1CB' }
      : { background: '#FFF7E6', color: '#B45309', border: '1px solid #FCD34D' }

  return (
    <span
      style={{
        ...styles,
        display: 'inline-block',
        borderRadius: 999,
        padding: '4px 9px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  )
}

export function NewSignupAdminEmail({
  name,
  email,
  role,
  sport,
  signedUpAt,
  approveUrl,
}: NewSignupAdminEmailProps) {
  return (
    <EmailLayout preview={`${email} just signed up for the beta`}>
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>New beta signup</Heading>

      <div
        style={{
          background: '#E1F5EE',
          border: '1px solid #9FE1CB',
          borderRadius: 12,
          padding: 18,
          margin: '0 0 18px',
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: 800, color: emailStyles.text, margin: '0 0 4px' }}>{name}</Text>
        <Text style={{ fontSize: 13, color: emailStyles.teal, margin: 0 }}>{email}</Text>
      </div>

      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '6px 16px', margin: '0 0 20px' }}>
        <InfoRow label="Role">
          <Badge tone="teal">{capitalize(role)}</Badge>
        </InfoRow>
        <InfoRow label="Sport">{sport || 'Not specified'}</InfoRow>
        <InfoRow label="Signed up">{signedUpAt}</InfoRow>
        <InfoRow label="Status">
          <Badge tone="amber">Pending approval</Badge>
        </InfoRow>
      </div>

      <EmailButton href={approveUrl}>Approve {name} →</EmailButton>

      <Text style={{ fontSize: 13, color: emailStyles.textSecondary, lineHeight: 1.6 }}>
        Or go to playvia.studio/dashboard/waitlist to manage all pending approvals.
      </Text>

      <Text style={{ fontSize: 12, color: emailStyles.textMuted, fontStyle: 'italic', lineHeight: 1.6, marginTop: 24 }}>
        This is an automated notification from Playvia. Reply to this email to contact {name} directly at {email}.
      </Text>
    </EmailLayout>
  )
}

export default NewSignupAdminEmail
