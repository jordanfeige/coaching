'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      queueMicrotask(() => setIsInstalled(true))
      return
    }

    // Check iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    queueMicrotask(() => setIsIOS(iOS))

    // Listen for Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after 30 seconds or after first analysis
      setTimeout(() => setShowPrompt(true), 30000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available - show update banner
            setShowUpdateBanner(true)
          }
        })
      })
    })

    // Reload page when new SW takes control
    const handleControllerChange = () => {
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  if (isInstalled || (!showPrompt && !isIOS && !showUpdateBanner)) return null

  if (showUpdateBanner) {
    return (
      <div className="fixed top-4 right-4 left-4 z-50 rounded-2xl p-4 shadow-lg"
        style={{ background: 'white', border: '1px solid hsl(168,62%,36%)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(220,20%,15%)' }}>
              Update available
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'hsl(220,10%,45%)' }}>
              A new version of Playvia is ready
            </p>
          </div>
          <button
            onClick={() => {
              navigator.serviceWorker.controller?.postMessage('skipWaiting')
              setShowUpdateBanner(false)
            }}
            className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: 'hsl(168,62%,36%)', color: 'white' }}>
            Update now
          </button>
        </div>
      </div>
    )
  }

  if (isIOS) return (
    <div className="fixed right-4 bottom-20 left-4 z-50 rounded-2xl p-4 shadow-lg"
      style={{ background: 'white', border: '1px solid hsl(30,10%,88%)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold"
            style={{ color: 'hsl(220,20%,15%)' }}>
            Install Playvia
          </p>
          <p className="mt-1 text-xs" style={{ color: 'hsl(220,10%,45%)' }}>
            Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
            {' '}for the best experience
          </p>
        </div>
        <button onClick={() => setShowPrompt(false)}
          className="shrink-0 text-xs"
          style={{ color: 'hsl(220,10%,65%)' }}>
          ✕
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed right-4 bottom-20 left-4 z-50 rounded-2xl p-4 shadow-lg"
      style={{ background: 'white', border: '1px solid hsl(30,10%,88%)' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold"
            style={{ color: 'hsl(220,20%,15%)' }}>
            Install Playvia
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'hsl(220,10%,45%)' }}>
            Get the full app experience
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPrompt(false)}
            className="rounded-xl border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'hsl(30,10%,88%)', color: 'hsl(220,10%,45%)' }}>
            Later
          </button>
          <button onClick={async () => {
            if (deferredPrompt) {
              await deferredPrompt.prompt()
              await deferredPrompt.userChoice
              setDeferredPrompt(null)
              setShowPrompt(false)
            }
          }}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: 'hsl(168,62%,36%)', color: 'white' }}>
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
