'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function registerServiceWorker() {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Playvia SW registered:', registration.scope)
          registration.update()
        })
        .catch(error => {
          console.log('SW registration failed:', error)
        })
    }

    if (document.readyState === 'complete') {
      registerServiceWorker()
      return
    }

    window.addEventListener('load', registerServiceWorker)
    return () => window.removeEventListener('load', registerServiceWorker)
  }, [])

  return null
}
