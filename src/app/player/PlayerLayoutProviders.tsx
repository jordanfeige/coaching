'use client'

import { Toaster } from 'sonner'
import AppLoadingRoot from '@/components/navigation/AppLoadingRoot'
import { AskViaProvider } from '@/components/player/ask-via/AskViaContext'

export default function PlayerLayoutProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLoadingRoot>
      <AskViaProvider>
        {children}
        <Toaster
          richColors
          position="bottom-center"
          mobileOffset={{ bottom: 80 }}
          offset={{ bottom: 24 }}
        />
      </AskViaProvider>
    </AppLoadingRoot>
  )
}
