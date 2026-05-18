'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrandMark } from '@/components/brand/BrandMark'
import { createClient } from '@/lib/supabase'
import { brand } from '@/lib/brand'

function AuthCallbackContent() {
  const [message, setMessage] = useState('Signing you in...')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function finishAuth() {
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setMessage(error.message)
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const profilePayload = {
        id: session.user.id,
        email: session.user.email ?? null,
        full_name:
          typeof session.user.user_metadata?.full_name === 'string'
            ? session.user.user_metadata.full_name
            : null,
      }

      const { error: upsertError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
      if (upsertError && (upsertError.message.includes("Could not find the 'full_name' column") || upsertError.message.includes('schema cache'))) {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email ?? null,
        }, { onConflict: 'id' })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, player_id')
        .eq('id', session.user.id)
        .single()

      if (!profile || !profile.role) {
        router.push('/onboarding/role')
        return
      }

      if (profile.role === 'coach') {
        router.push('/dashboard')
      } else if (profile.player_id) {
        router.push('/player')
      } else {
        router.push('/player?welcome=true')
      }
    }

    finishAuth()
  }, [router, searchParams, supabase])

  return (
    <main className="flex min-h-screen items-center justify-center px-5" style={{ background: brand.bg }}>
      <div className="text-center">
        <BrandMark size="md" className="text-center" />
        <div className="mx-auto mt-8 size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm" style={{ color: brand.textSecondary }}>{message}</p>
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center" style={{ background: brand.bg }}>Signing you in...</main>}>
      <AuthCallbackContent />
    </Suspense>
  )
}
