import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()

  // Client standard pour vérifier l'auth de l'appelant
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!caller || caller.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { email, full_name, role, password } = await request.json()

  if (!email || !full_name || !role || !password) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  // Client admin (service role) pour créer l'utilisateur
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name, role },
    email_confirm: true,
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la création' },
      { status: 500 }
    )
  }

  // Récupère le profil créé par le trigger
  const { data: profile } = await adminClient
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  return NextResponse.json({ user: profile })
}
