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

export async function PATCH(request: Request) {
  const ctx = await getAdminContext()
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id, full_name, role } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (full_name) updates.full_name = full_name
  if (role) updates.role = role

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 })
  }

  const { data: profile, error } = await ctx.admin!
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sync auth metadata si on modifie le nom ou le rôle
  if (full_name || role) {
    await ctx.admin!.auth.admin.updateUserById(id, {
      user_metadata: {
        ...(full_name && { full_name }),
        ...(role && { role }),
      },
    })
  }

  return NextResponse.json({ user: profile })
}

export async function DELETE(request: Request) {
  const ctx = await getAdminContext()
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  const { error } = await ctx.admin!.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
