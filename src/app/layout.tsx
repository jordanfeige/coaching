import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Playvia',
  description: 'AI Coaching for Modern Athletes — scheduling, drills, and video feedback for coaches and players.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}