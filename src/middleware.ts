import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/pricing',
    '/book',
    '/pending',
    '/onboarding',
  ]
  const isPublic =
    publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`)) ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')

  if (isPublic) return supabaseResponse

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

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, player_id, beta_status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.beta_status !== 'approved') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }

    const role = profile?.role
    if (!role && (pathname.startsWith('/dashboard') || pathname.startsWith('/player') || pathname.startsWith('/analyze'))) {
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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
}
