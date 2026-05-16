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

    if (!user) {
      if (
        request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/player')
      ) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return supabaseResponse
    }

    // Get role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'player'
    const isCoach = role === 'coach'
    const isPlayer = role === 'player'
    const onDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const onPlayer = request.nextUrl.pathname.startsWith('/player')

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
  matcher: ['/dashboard/:path*', '/player/:path*'],
}