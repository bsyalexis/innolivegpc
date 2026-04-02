import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderKanban, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/types'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  en_brief: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  en_production: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_livraison: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  livre: 'bg-green-500/10 text-green-400 border-green-500/20',
  archive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name, status, deadline, brief, created_at,
      client:users!projects_client_id_fkey(id, full_name),
      members:project_members(user:users(id, full_name, avatar_url))
    `)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped = (projects || []).reduce((acc: Record<string, any[]>, p) => {
    if (!acc[p.status]) acc[p.status] = []
    acc[p.status].push(p)
    return acc
  }, {})

  const statusOrder: ProjectStatus[] = [
    'en_brief', 'en_production', 'en_livraison', 'livre', 'archive'
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Projets</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {projects?.length ?? 0} projet{(projects?.length ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild className="bg-[var(--primary)] hover:bg-indigo-500 text-white">
          <Link href="/dashboard/projects/new">
            <Plus size={15} className="mr-2" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      {/* Filtres par statut */}
      {statusOrder.map((status) => {
        const list = grouped[status]
        if (!list || list.length === 0) return null
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant="outline"
                className={`text-xs ${STATUS_COLORS[status]}`}
              >
                {PROJECT_STATUS_LABELS[status]}
              </Badge>
              <span className="text-xs text-[var(--muted-foreground)]">
                {list.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="group bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)]/40 hover:bg-[var(--muted)] transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban size={15} className="text-[var(--primary)] shrink-0 mt-0.5" />
                      <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                        {project.name}
                      </h3>
                    </div>
                  </div>

                  {project.brief && (
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
                      {project.brief}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    {project.client && (
                      <div className="flex items-center gap-1">
                        <User size={11} />
                        <span>{(project.client as unknown as { full_name: string }).full_name}</span>
                      </div>
                    )}
                    {project.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        <span>{formatDate(project.deadline)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      {(!projects || projects.length === 0) && (
        <div className="text-center py-20 text-[var(--muted-foreground)]">
          <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun projet pour l&apos;instant.</p>
          <Button asChild className="mt-4 bg-[var(--primary)] hover:bg-indigo-500 text-white">
            <Link href="/dashboard/projects/new">Créer le premier projet</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
