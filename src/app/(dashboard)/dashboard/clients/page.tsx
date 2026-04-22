import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientCRM from '@/components/clients/ClientCRM'

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

  const { data: clients } = await supabase
    .from('users')
    .select('id, email, full_name, created_at, avatar_url, sector, city, mrr, portal_enabled, contact_email, contact_phone')
    .eq('role', 'CLIENT')
    .order('created_at', { ascending: false })

  const clientIds = (clients ?? []).map((c) => c.id)

  const { data: projectsRaw } = clientIds.length > 0
    ? await supabase
        .from('projects')
        .select('client_id, id, name, code, status, budget')
        .in('client_id', clientIds)
        .neq('status', 'archive')
    : { data: [] }

  // Agréger par client
  type ProjectInfo = { id: string; name: string; code?: string | null; status: string; budget?: number | null }
  const projectsByClient: Record<string, ProjectInfo[]> = {}
  let totalMRR = 0
  let totalBudget = 0

  for (const p of projectsRaw ?? []) {
    if (!p.client_id) continue
    if (!projectsByClient[p.client_id]) projectsByClient[p.client_id] = []
    projectsByClient[p.client_id].push(p)
    if (p.budget) totalBudget += p.budget
  }

  for (const c of clients ?? []) {
    if (c.mrr) totalMRR += Number(c.mrr)
  }

  const enrichedClients = (clients ?? []).map((c) => ({
    ...c,
    projects: projectsByClient[c.id] ?? [],
    projectCount: (projectsByClient[c.id] ?? []).length,
  }))

  const portalCount = (clients ?? []).filter((c) => c.portal_enabled).length
  const activeCount = enrichedClients.filter((c) => c.projectCount > 0).length

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div>
        <p className="text-[11px] text-[var(--muted-foreground)] tracking-widest uppercase mb-2">
          CRM · Base clients
        </p>
        <h1 className="headline text-[44px] leading-[0.95] uppercase">
          Nos&nbsp;<span className="highlight-blue">Clients</span>
          <span className="text-[var(--muted-foreground)]">&nbsp;&amp;&nbsp;</span>
          <span className="highlight-orange">Partenaires</span>
        </h1>
      </div>

      <ClientCRM
        clients={enrichedClients}
        kpis={{ total: clients?.length ?? 0, active: activeCount, mrr: totalMRR, portal: portalCount, budget: totalBudget }}
      />
    </div>
  )
}
