import type { ReactElement } from 'react'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ADMIN_EMAILS } from '@/lib/admin'

const FROM = 'Playvia <noreply@playvia.studio>'

function getResend() {
  const apiKey = process.env.RESEND_API_KEY_PLAYVIA
  if (!apiKey) throw new Error('RESEND_API_KEY_PLAYVIA is not set')
  return new Resend(apiKey)
}

export async function sendEmail({
  to,
  subject,
  template,
  idempotencyKey,
}: {
  to: string
  subject: string
  template: ReactElement
  idempotencyKey?: string
}) {
  const html = await render(template)

  try {
    const { data, error } = await getResend().emails.send(
      {
        from: FROM,
        to,
        subject,
        html,
      },
      idempotencyKey ? { idempotencyKey } : undefined
    )

    if (error) console.error('Email error:', error)
    return { success: !error, data, error }
  } catch (error) {
    console.error('Email send failed:', error)
    return { success: false, error }
  }
}

export async function sendLessonBookedPlayer(props: {
  to: string
  playerName: string
  coachName: string
  date: string
  time: string
  duration: string
  sport: string
  lessonUrl: string
}) {
  const { LessonBookedPlayerEmail } = await import('@/emails/LessonBookedPlayerEmail')
  return sendEmail({
    to: props.to,
    subject: `Lesson confirmed — ${props.date}`,
    template: <LessonBookedPlayerEmail {...props} />,
    idempotencyKey: `lesson-booked-player/${props.to}/${props.date}/${props.time}`,
  })
}

export async function sendLessonBookedCoach(props: {
  to: string
  playerName: string
  playerEmail: string
  date: string
  time: string
  duration: string
  sport: string
  skillLevel: string
  lessonUrl: string
}) {
  const { LessonBookedCoachEmail } = await import('@/emails/LessonBookedCoachEmail')
  return sendEmail({
    to: props.to,
    subject: `New lesson booked — ${props.playerName} on ${props.date}`,
    template: <LessonBookedCoachEmail {...props} />,
    idempotencyKey: `lesson-booked-coach/${props.to}/${props.playerEmail}/${props.date}/${props.time}`,
  })
}

export async function sendLessonCancelledPlayer(props: {
  to: string
  playerName: string
  coachName: string
  date: string
  time: string
  sport: string
  reason?: string
  bookingUrl: string
}) {
  const { LessonCancelledPlayerEmail } = await import('@/emails/LessonCancelledPlayerEmail')
  return sendEmail({
    to: props.to,
    subject: `Lesson cancelled — ${props.date}`,
    template: <LessonCancelledPlayerEmail {...props} />,
    idempotencyKey: `lesson-cancelled-player/${props.to}/${props.date}/${props.time}`,
  })
}

export async function sendLessonCancelledCoach(props: {
  to: string
  playerName: string
  date: string
  time: string
  sport: string
  dashboardUrl: string
}) {
  const { LessonCancelledCoachEmail } = await import('@/emails/LessonCancelledCoachEmail')
  return sendEmail({
    to: props.to,
    subject: `Lesson cancelled — ${props.playerName} on ${props.date}`,
    template: <LessonCancelledCoachEmail {...props} />,
    idempotencyKey: `lesson-cancelled-coach/${props.to}/${props.playerName}/${props.date}/${props.time}`,
  })
}

export async function sendLessonRescheduledPlayer(props: {
  to: string
  playerName: string
  coachName: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
  sport: string
  duration: string
  lessonUrl: string
}) {
  const { LessonRescheduledPlayerEmail } = await import('@/emails/LessonRescheduledPlayerEmail')
  return sendEmail({
    to: props.to,
    subject: `Lesson rescheduled — now ${props.newDate}`,
    template: <LessonRescheduledPlayerEmail {...props} />,
    idempotencyKey: `lesson-rescheduled-player/${props.to}/${props.oldDate}/${props.oldTime}/${props.newDate}/${props.newTime}`,
  })
}

export async function sendLessonRescheduledCoach(props: {
  to: string
  playerName: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
  sport: string
  lessonUrl: string
}) {
  const { LessonRescheduledCoachEmail } = await import('@/emails/LessonRescheduledCoachEmail')
  return sendEmail({
    to: props.to,
    subject: `Lesson rescheduled — ${props.playerName} now on ${props.newDate}`,
    template: <LessonRescheduledCoachEmail {...props} />,
    idempotencyKey: `lesson-rescheduled-coach/${props.to}/${props.playerName}/${props.oldDate}/${props.oldTime}/${props.newDate}/${props.newTime}`,
  })
}

export async function sendAnalysisComplete(props: {
  to: string
  playerName: string
  sport: string
  shotType: string
  overallScore: number
  rating: string
  topIssue: string
  biggestWin: string
  analysisUrl: string
}) {
  const { AnalysisCompleteEmail } = await import('@/emails/AnalysisCompleteEmail')
  return sendEmail({
    to: props.to,
    subject: `Your ${props.sport} analysis is ready — score: ${props.overallScore}`,
    template: <AnalysisCompleteEmail {...props} />,
    idempotencyKey: `analysis-complete/${props.to}/${props.sport}/${props.shotType}/${props.overallScore}`,
  })
}

export async function sendWelcome(props: {
  to: string
  name: string
  role: 'coach' | 'player'
}) {
  const { WelcomeEmail } = await import('@/emails/WelcomeEmail')
  return sendEmail({
    to: props.to,
    subject: `Welcome to Playvia, ${props.name}`,
    template: <WelcomeEmail name={props.name} role={props.role} />,
    idempotencyKey: `welcome/${props.to}/${props.role}`,
  })
}

export async function sendProUpgrade(props: {
  to: string
  name: string
  plan: string
  amount: string
  billingPeriod: string
  nextBillingDate: string
  dashboardUrl: string
}) {
  const { ProUpgradeEmail } = await import('@/emails/ProUpgradeEmail')
  return sendEmail({
    to: props.to,
    subject: `Welcome to Playvia ${props.plan} — you're all set`,
    template: <ProUpgradeEmail {...props} />,
    idempotencyKey: `pro-upgrade/${props.to}/${props.plan}/${props.nextBillingDate}`,
  })
}

export async function sendBetaApproved(props: {
  to: string
  name: string
  role: 'coach' | 'player'
}) {
  const { BetaApprovedEmail } = await import('@/emails/BetaApprovedEmail')
  return sendEmail({
    to: props.to,
    subject: "You're in — welcome to the Playvia beta",
    template: <BetaApprovedEmail name={props.name} role={props.role} />,
    idempotencyKey: `beta-approved/${props.to}/${props.role}`,
  })
}

export async function sendNewSignupAdmin(props: {
  name: string
  email: string
  role: 'coach' | 'player'
  sport?: string
  signedUpAt: string
}) {
  const { NewSignupAdminEmail } = await import('@/emails/NewSignupAdminEmail')
  return sendEmail({
    to: ADMIN_EMAILS[0],
    subject: `New Playvia signup — ${props.name} (${props.role})`,
    template: (
      <NewSignupAdminEmail
        {...props}
        approveUrl="https://playvia.studio/dashboard/waitlist"
      />
    ),
    idempotencyKey: `new-signup-admin/${props.email}/${props.role}/${props.signedUpAt}`,
  })
}
