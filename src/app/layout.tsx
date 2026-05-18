import type { Metadata } from 'next'
import './globals.css'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

export const metadata: Metadata = {
  title: 'Playvia — AI Coaching for Modern Athletes',
  description: 'Upload a video. Get instant AI technique analysis, personalized drills, and coaching resources for any sport.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Playvia',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Playvia',
    title: 'Playvia — AI Coaching for Modern Athletes',
    description: 'AI-powered technique analysis for tennis, golf, baseball and basketball.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Playvia — AI Coaching for Modern Athletes',
    description: 'AI-powered technique analysis for tennis, golf, baseball and basketball.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="Playvia" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Playvia" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2D9B7F" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
        <PWAInstallPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
     if ('serviceWorker' in navigator) {
       window.addEventListener('load', function() {
         navigator.serviceWorker.register('/sw.js')
           .then(function(registration) {
             console.log('Playvia SW registered:', registration.scope);
             registration.update();
           })
           .catch(function(error) {
             console.log('SW registration failed:', error);
           });
       });
     }
   `,
          }}
        />
      </body>
    </html>
  )
}