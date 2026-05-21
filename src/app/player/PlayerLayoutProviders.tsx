'use client'

import AppLoadingRoot from '@/components/navigation/AppLoadingRoot'
import { AskViaProvider } from '@/components/player/ask-via/AskViaContext'

export default function PlayerLayoutProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLoadingRoot>
      <AskViaProvider>{children}</AskViaProvider>
    </AppLoadingRoot>
  )
}
