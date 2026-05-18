import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const protectedOnboarding =
      pathname.startsWith('/onboarding/profile') ||
      pathname.startsWith('/onboarding/ready') ||
      pathname.startsWith('/onboarding/role')
    const protectedAnalyze = pathname === '/analyze' || pathname.startsWith('/analyze/')

    if (!user) {
      if (protectedAnalyze) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      if (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/player') ||
        protectedOnboarding
      ) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return supabaseResponse
    }

    // Get role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, player_id')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    if (!role && (pathname.startsWith('/dashboard') || pathname.startsWith('/player') || protectedAnalyze)) {
      return NextResponse.redirect(new URL('/onboarding/role', request.url))
    }

    const isCoach = role === 'coach'
    const isPlayer = role === 'player'
    const onDashboard = pathname.startsWith('/dashboard')
    const onPlayer = pathname.startsWith('/player')

    // Player trying to access coach dashboard → redirect to player portal
    if (isPlayer && onDashboard) {
      return NextResponse.redirect(new URL('/player', request.url))
    }

    // Coach trying to access player portal → redirect to dashboard
    if (isCoach && onPlayer) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.includes('supabase')) {
        response.cookies.delete(cookie.name)
      }
    })
    return response
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/player/:path*', '/onboarding/:path*', '/analyze/:path*'],
}
