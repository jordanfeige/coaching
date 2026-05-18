'use client'

import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/brand/BrandMark'
import { createClient } from '@/lib/supabase'

type SmartBrandMarkProps = {
  variant?: 'sidebar' | 'authHero' | 'authPanel' | 'public'
  audience?: string
  className?: string
}

export function SmartBrandMark(props: SmartBrandMarkProps) {
  const [href, setHref] = useState('/')

  useEffect(() => {
    let active = true

    async function resolveHref() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active) return
      if (!user) {
        setHref('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, player_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return
      if (profile?.role === 'coach') {
        setHref('/dashboard')
      } else {
        setHref('/player')
      }
    }

    resolveHref()
    return () => {
      active = false
    }
  }, [])

  return <BrandMark {...props} href={href} />
}
