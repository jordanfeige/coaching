import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'

type WelcomeEmailProps = {
  name: string
  role: 'coach' | 'player'
}

function FeatureCallouts({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
      {items.map(item => (
        <span
          key={item}
          style={{
            padding: '8px 10px',
            borderRadius: 999,
            background: '#F5F4F0',
            color: emailStyles.textSecondary,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export function WelcomeEmail({ name, role }: WelcomeEmailProps) {
  const player = role === 'player'
  return (
    <EmailLayout preview="You're in — here's how to get started">
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>Welcome, {name}</Heading>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        {player
          ? 'Your account is set up. You have 3 free AI analyses to get started — upload a short video of your technique and get a detailed coaching report in under 60 seconds.'
          : "Your coaching account is ready. Add your first player to get started — they'll receive an invite and can view their lessons, drills, and AI feedback in their player portal."}
      </Text>
      <EmailButton href={player ? 'https://playvia.studio/player/analyze' : 'https://playvia.studio/dashboard'}>
        {player ? 'Analyze your technique →' : 'Go to your dashboard →'}
      </EmailButton>
      <FeatureCallouts
        items={
          player
            ? ['🎯 Technique score', '📊 Progress tracking', '🎬 Coaching videos']
            : ['👥 Player roster', '🤖 AI drill builder', '📹 Video analysis']
        }
      />
    </EmailLayout>
  )
}

export default WelcomeEmail
