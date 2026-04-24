import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireTeam() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!data || !['ADMIN', 'TEAM'].includes(data.role)) return null
  return supabase
}

export async function GET(request: Request) {
  const supabase = await requireTeam()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')

  let query = supabase
    .from('projects')
    .select('id, name, status, deadline, budget, color, code')
    .order('created_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
