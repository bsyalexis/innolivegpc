import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import {
  PROJECT_STATUS_LABELS,
  PROJECT_CATEGORY_LABELS,
  type ProjectCategory,
} from '@/types'
import ProjectsGrid from '@/components/projects/ProjectsGrid'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; status?: string }>
}) {
  const { category, q, status } = await searchParams
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  let query = supabase
    .from('projects')
    .select(`
      id, name, status, deadline, brief, created_at, color, code, category, budget, progress, tags, lead_id,
      client:users!projects_client_id_fkey(id, full_name),
      members:project_members(user:users(id, full_name, avatar_url))
    `)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (status) query = query.eq('status', status)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data: projects } = await query

  const total = projects?.length ?? 0

  // Compte par catégorie pour les filtres
  const { data: allProjects } = await supabase
    .from('projects')
    .select('category, status')

  const catCounts: Record<string, number> = {}
  const statusCounts: Record<string, number> = {}
  for (const p of allProjects ?? []) {
    if (p.category) catCounts[p.category] = (catCounts[p.category] ?? 0) + 1
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div>
        <p className="text-[11px] text-[var(--muted-foreground)] tracking-widest uppercase mb-2">
          {total} projet{total > 1 ? 's' : ''} · {category ? PROJECT_CATEGORY_LABELS[category as ProjectCategory] : 'toutes catégories'}
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="headline text-[44px] leading-[0.95] uppercase">
            Nos&nbsp;<span className="highlight-blue">Projets</span>
            <span className="text-[var(--muted-foreground)]">&nbsp;&amp;&nbsp;</span>
            <span className="highlight-orange">Clients</span>
          </h1>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--ink)] text-white text-[13px] font-semibold shrink-0 transition-transform hover:-translate-y-px"
          >
            <Plus size={15} />
            Nouveau projet
          </Link>
        </div>
      </div>

      <ProjectsGrid
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projects={(projects ?? []) as any}
        catCounts={catCounts}
        statusCounts={statusCounts}
        activeCategory={category}
        activeStatus={status}
        searchQuery={q}
        statusLabels={PROJECT_STATUS_LABELS}
        categoryLabels={PROJECT_CATEGORY_LABELS}
      />
    </div>
  )
}
