import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientManager from '@/components/clients/ClientManager'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (currentUser?.role !== 'ADMIN') redirect('/dashboard')

  // Récupère tous les clients avec le nombre de projets associés
  const { data: clients } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'CLIENT')
    .order('created_at', { ascending: false })

  // Compte les projets par client
  const clientIds = (clients ?? []).map((c) => c.id)
  const { data: projectCounts } = clientIds.length > 0
    ? await supabase
        .from('projects')
        .select('client_id')
        .in('client_id', clientIds)
        .neq('status', 'archive')
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const p of projectCounts ?? []) {
    if (p.client_id) countMap[p.client_id] = (countMap[p.client_id] ?? 0) + 1
  }

  const clientsWithCount = (clients ?? []).map((c) => ({
    ...c,
    projectCount: countMap[c.id] ?? 0,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Gestion des clients</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Créez et gérez les accès clients au portail.
        </p>
      </div>

      <ClientManager clients={clientsWithCount} />
    </div>
  )
}
