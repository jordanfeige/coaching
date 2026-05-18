import { NextRequest, NextResponse } from 'next/server'
import {
  sendLessonBookedCoach,
  sendLessonBookedPlayer,
  sendLessonCancelledCoach,
  sendLessonCancelledPlayer,
  sendLessonRescheduledCoach,
  sendLessonRescheduledPlayer,
  sendAnalysisComplete,
  sendNewSignupAdmin,
  sendProUpgrade,
  sendWelcome,
} from '@/lib/email'
import { ADMIN_EMAILS } from '@/lib/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, to, ...props } = body
  const recipient =
    to ||
    (typeof type === 'string' && type.endsWith('_coach') ? process.env.COACH_EMAIL : null) ||
    (type === 'new_signup_admin' ? ADMIN_EMAILS[0] : null)

  if (!type || !recipient) {
    return NextResponse.json({ error: 'Email type and recipient are required' }, { status: 400 })
  }

  try {
    switch (type) {
      case 'lesson_booked_player':
        await sendLessonBookedPlayer({ to: recipient, ...props })
        break
      case 'lesson_booked_coach':
        await sendLessonBookedCoach({ to: recipient, ...props })
        break
      case 'lesson_cancelled_player':
        await sendLessonCancelledPlayer({ to: recipient, ...props })
        break
      case 'lesson_cancelled_coach':
        await sendLessonCancelledCoach({ to: recipient, ...props })
        break
      case 'lesson_rescheduled_player':
        await sendLessonRescheduledPlayer({ to: recipient, ...props })
        break
      case 'lesson_rescheduled_coach':
        await sendLessonRescheduledCoach({ to: recipient, ...props })
        break
      case 'welcome':
        await sendWelcome({ to: recipient, ...props })
        break
      case 'pro_upgrade':
        await sendProUpgrade({ to: recipient, ...props })
        break
      case 'new_signup_admin':
        await sendNewSignupAdmin({
          name: props.name,
          email: props.email,
          role: props.role,
          sport: props.sport,
          signedUpAt: props.signedUpAt,
        })
        break
      case 'analysis_pdf':
        await sendAnalysisComplete({
          to: recipient,
          playerName: props.playerName,
          sport: props.sport,
          shotType: props.shotType || '',
          overallScore: props.overallScore,
          rating: props.analysis?.overall_rating || 'developing',
          topIssue: props.analysis?.areas_to_improve?.[0]?.area || '',
          biggestWin: props.analysis?.biggest_win || '',
          analysisUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://playvia.studio'}/player/progress`,
        })
        break
      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Email send failed' },
      { status: 500 }
    )
  }
}
