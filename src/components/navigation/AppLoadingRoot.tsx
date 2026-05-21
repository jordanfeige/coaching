'use client'

import { PageLoadingProvider } from '@/contexts/PageLoadingContext'

export default function AppLoadingRoot({
  children,
}: {
  children: React.ReactNode
}) {
  return <PageLoadingProvider>{children}</PageLoadingProvider>
}
