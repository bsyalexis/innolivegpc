import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!data || !['ADMIN', 'TEAM'].includes(data.role)) return null
  return { supabase, user }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')

  let query = auth.supabase
    .from('invoices')
    .select(`
      id, title, amount, status, due_date, paid_at, description, created_at,
      client:users!invoices_client_id_fkey(id, full_name, email),
      project:projects(id, name)
    `)
    .order('created_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { client_id, project_id, title, amount, status, due_date, description } = body

  if (!client_id || !title || !amount) {
    return NextResponse.json({ error: 'client_id, title and amount are required' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('invoices')
    .insert({
      client_id,
      project_id: project_id || null,
      title,
      amount: parseFloat(amount),
      status: status || 'en_attente',
      due_date: due_date || null,
      description: description || null,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, status, paid_at, due_date, amount, title, description } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (paid_at !== undefined) updates.paid_at = paid_at
  if (due_date !== undefined) updates.due_date = due_date
  if (amount !== undefined) updates.amount = parseFloat(amount)
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description

  if (status === 'payee' && !paid_at) {
    updates.paid_at = new Date().toISOString()
  }

  const { data, error } = await auth.supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await auth.supabase
    .from('invoices')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
