import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Routes publiques
  if (pathname.startsWith('/login')) {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Routes protégées — redirige vers login si non authentifié
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Récupère le rôle depuis les métadonnées utilisateur
  const role = user.user_metadata?.role as string | undefined

  // Le portail /client/* est réservé aux CLIENT
  if (pathname.startsWith('/client') && role !== 'CLIENT') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Le dashboard /dashboard/* est interdit aux CLIENT
  if (pathname.startsWith('/dashboard') && role === 'CLIENT') {
    return NextResponse.redirect(new URL('/client', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
