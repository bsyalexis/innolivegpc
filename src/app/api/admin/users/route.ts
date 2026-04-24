import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getAdminContext() {
  const cookieStore = await cookies()

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
  if (!authUser) return { error: 'Non autorisé', status: 401 as const, supabase: null, admin: null }

  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!caller || caller.role !== 'ADMIN') {
    return { error: 'Accès refusé', status: 403 as const, supabase: null, admin: null }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  return { error: null, status: null, supabase, admin }
}

// GET — récupère un utilisateur par son id (pour le drawer)
export async function GET(request: Request) {
  const ctx = await getAdminContext()
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  const { data: profile, error } = await ctx.supabase!
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !profile) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  // On récupère aussi les auth metadata via admin (last_sign_in, email confirmé)
  const { data: authData } = await ctx.admin!.auth.admin.getUserById(id)

  return NextResponse.json({
    ...profile,
    auth: authData?.user
      ? {
          email_confirmed: authData.user.email_confirmed_at !== null,
          last_sign_in: authData.user.last_sign_in_at,
          created_at: authData.user.created_at,
        }
      : null,
  })
}

// POST — créer un nouvel utilisateur
export async function POST(request: Request) {
  const ctx = await getAdminContext()
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { email, full_name, role, password } = await request.json()

  if (!email || !full_name || !role || !password) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data, error } = await ctx.admin!.auth.admin.createUser({
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

  const { data: profile } = await ctx.admin!
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  return NextResponse.json({ user: profile })
}

// PATCH — modifier un utilisateur (profil + connexion)
export async function PATCH(request: Request) {
  const ctx = await getAdminContext()
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json()
  const {
    id,
    // Champs Auth
    email,
    password,
    // Champs profil public.users
    full_name,
    role,
    sector,
    city,
    contact_email,
    contact_phone,
    mrr,
    portal_enabled,
    avatar_url,
  } = body

  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  // 1. Mise à jour auth (email + password via admin API)
  const authUpdates: Record<string, unknown> = {}
  const authMeta: Record<string, unknown> = {}

  if (email) authUpdates.email = email
  if (password) authUpdates.password = password
  if (full_name) authMeta.full_name = full_name
  if (role) authMeta.role = role

  if (Object.keys(authUpdates).length > 0 || Object.keys(authMeta).length > 0) {
    const { error: authError } = await ctx.admin!.auth.admin.updateUserById(id, {
      ...authUpdates,
      user_metadata: authMeta,
    })
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }
  }

  // 2. Mise à jour public.users
  const profileUpdates: Record<string, unknown> = {}
  if (full_name !== undefined) profileUpdates.full_name = full_name
  if (role !== undefined) profileUpdates.role = role
  if (email !== undefined) profileUpdates.email = email
  if (sector !== undefined) profileUpdates.sector = sector || null
  if (city !== undefined) profileUpdates.city = city || null
  if (contact_email !== undefined) profileUpdates.contact_email = contact_email || null
  if (contact_phone !== undefined) profileUpdates.contact_phone = contact_phone || null
  if (mrr !== undefined) profileUpdates.mrr = mrr === '' ? null : parseFloat(String(mrr))
  if (portal_enabled !== undefined) profileUpdates.portal_enabled = portal_enabled
  if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url || null

  if (Object.keys(profileUpdates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await ctx.admin!
    .from('users')
    .update(profileUpdates)
    .eq('id', id)
    .select('*')
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ user: profile })
}

// DELETE — supprimer un utilisateur
export async function DELETE(request: Request) {
  const ctx = await getAdminContext()
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  const { error } = await ctx.admin!.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
