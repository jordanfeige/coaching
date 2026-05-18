import { Body } from '@react-email/body'
import { Container } from '@react-email/container'
import { Head } from '@react-email/head'
import { Html } from '@react-email/html'
import { Link } from '@react-email/link'
import { Preview } from '@react-email/preview'
import { Text } from '@react-email/text'

interface Props {
  children: React.ReactNode
  preview?: string
}

export const emailStyles = {
  teal: '#2D9B7F',
  bg: '#F5F4F0',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  font: 'Arial, sans-serif',
} as const

export default function EmailLayout({ children, preview }: Props) {
  return (
    <Html>
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Body
        style={{
          background: emailStyles.bg,
          fontFamily: emailStyles.font,
          margin: 0,
          padding: '40px 20px',
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: '0 auto',
            background: emailStyles.card,
            borderRadius: 12,
            overflow: 'hidden',
            border: `1px solid ${emailStyles.border}`,
          }}
        >
          <div
            style={{
              background: emailStyles.teal,
              padding: '24px 32px',
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              Playvia
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.75)',
                margin: '2px 0 0',
              }}
            >
              AI Coaching for Modern Athletes
            </Text>
          </div>

          <div style={{ padding: '32px 32px 24px' }}>{children}</div>

          <div
            style={{
              borderTop: `1px solid ${emailStyles.border}`,
              padding: '20px 32px',
              background: '#F9F8F5',
            }}
          >
            <Text style={{ fontSize: 12, color: emailStyles.textMuted, margin: 0, lineHeight: 1.6 }}>
              Playvia · AI Coaching for Modern Athletes
              <br />
              <Link href="https://playvia.studio" style={{ color: emailStyles.teal, textDecoration: 'none' }}>
                playvia.studio
              </Link>
              {' · '}
              <Link href="https://playvia.studio/login" style={{ color: emailStyles.textMuted, textDecoration: 'none' }}>
                Sign in
              </Link>
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}
