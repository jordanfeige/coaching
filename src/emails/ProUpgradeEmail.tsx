import { Heading } from '@react-email/heading'
import { Text } from '@react-email/text'
import EmailButton from '@/emails/components/EmailButton'
import EmailLayout, { emailStyles } from '@/emails/components/EmailLayout'
import EmailInfoRow from '@/emails/components/EmailInfoRow'

type ProUpgradeEmailProps = {
  name: string
  plan: string
  amount: string
  billingPeriod: string
  nextBillingDate: string
  dashboardUrl: string
}

export function ProUpgradeEmail({ plan, amount, billingPeriod, nextBillingDate, dashboardUrl }: ProUpgradeEmailProps) {
  return (
    <EmailLayout preview="Your subscription is active. Unlimited analyses, full progress tracking.">
      <Heading style={{ fontSize: 26, margin: '0 0 16px', color: emailStyles.text }}>You&apos;re now on {plan}</Heading>
      <div style={{ background: '#E1F5EE', borderRadius: 12, padding: 14, margin: '0 0 18px' }}>
        <Text style={{ fontSize: 14, color: emailStyles.teal, fontWeight: 700, margin: 0 }}>✓ Subscription active</Text>
      </div>
      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, margin: '18px 0' }}>
        <EmailInfoRow label="Plan" value={`Playvia ${plan}`} />
        <EmailInfoRow label="Amount" value={`${amount}/${billingPeriod}`} />
        <EmailInfoRow label="Next billing date" value={nextBillingDate} />
      </div>
      <Text style={{ fontSize: 15, lineHeight: 1.6, color: emailStyles.textSecondary }}>
        You now have unlimited AI analyses, full progress tracking, and weekly practice plans. Start uploading.
      </Text>
      <EmailButton href={dashboardUrl}>Go to your dashboard →</EmailButton>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
        {['∞ Unlimited analyses', '📈 Progress timeline', '📋 Weekly practice plans'].map(item => (
          <span key={item} style={{ padding: '8px 10px', borderRadius: 999, background: '#F5F4F0', color: emailStyles.textSecondary, fontSize: 12, fontWeight: 600 }}>
            {item}
          </span>
        ))}
      </div>
      <Text style={{ fontSize: 12, color: emailStyles.textMuted, lineHeight: 1.6, marginTop: 24 }}>
        Manage or cancel your subscription anytime in account settings.
      </Text>
    </EmailLayout>
  )
}

export default ProUpgradeEmail
