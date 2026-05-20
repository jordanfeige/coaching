'use client'

import { ViaContextProvider } from '@/components/via/UniversalViaContext'

export default function PlayerLayoutProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return <ViaContextProvider>{children}</ViaContextProvider>
}
