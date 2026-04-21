import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { FolderKanban, CheckSquare, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  en_brief: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  en_production: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_livraison: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  livre: 'bg-green-500/10 text-green-400 border-green-500/20',
  archive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', authUser.id)
    .single()

  const isAdmin = currentUser?.role === 'ADMIN'

  // TEAM : seulement les projets dont ils sont membres. ADMIN : tous les projets.
  const projectsQuery = isAdmin
    ? supabase.from('projects').select('id, status').neq('status', 'archive')
    : supabase
        .from('project_members')
        .select('project:projects!project_members_project_id_fkey(id, status)')
        .eq('user_id', authUser.id)

  const recentQuery = isAdmin
    ? supabase
        .from('projects')
        .select('id, name, status, deadline, client:users!projects_client_id_fkey(full_name)')
        .neq('status', 'archive')
        .order('updated_at', { ascending: false })
        .limit(5)
    : supabase
        .from('project_members')
        .select('project:projects!project_members_project_id_fkey(id, name, status, deadline, client:users!projects_client_id_fkey(full_name))')
        .eq('user_id', authUser.id)
        .limit(5)

  const [
    { data: projectsRaw },
    { data: myTasks },
    { data: recentRaw },
  ] = await Promise.all([
    projectsQuery,
    supabase.from('tasks').select('id, status').eq('assignee_id', authUser.id).neq('status', 'termine'),
    recentQuery,
  ])

  // Normalise les résultats selon le rôle
  type ProjectRow = { id: string; status: string }
  type RecentRow = { id: string; name: string; status: string; deadline?: string | null; client?: { full_name: string } | null }

  const projects: ProjectRow[] = isAdmin
    ? (projectsRaw as ProjectRow[] | null) ?? []
    : ((projectsRaw as { project: ProjectRow }[] | null) ?? []).map((r) => r.project)

  const recentProjects: RecentRow[] = isAdmin
    ? (recentRaw as RecentRow[] | null) ?? []
    : ((recentRaw as { project: RecentRow }[] | null) ?? []).map((r) => r.project)

  const statusCounts = (projects || []).reduce((acc, p) => {
    acc[p.status as ProjectStatus] = (acc[p.status as ProjectStatus] || 0) + 1
    return acc
  }, {} as Record<ProjectStatus, number>)

  const firstName = currentUser?.full_name?.split(' ')[0] ?? 'vous'

  const stats = [
    {
      label: isAdmin ? 'Projets actifs' : 'Mes projets',
      value: projects?.length ?? 0,
      icon: FolderKanban,
      color: 'text-[var(--primary)]',
    },
    {
      label: 'Mes tâches en cours',
      value: myTasks?.length ?? 0,
      icon: CheckSquare,
      color: 'text-blue-400',
    },
    {
      label: 'En production',
      value: statusCounts['en_production'] ?? 0,
      icon: TrendingUp,
      color: 'text-green-400',
    },
    {
      label: 'En livraison',
      value: statusCounts['en_livraison'] ?? 0,
      icon: Clock,
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Bonjour, {firstName}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {isAdmin ? "Vue d'ensemble de l'activité Innolive" : 'Vos projets et tâches en cours'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-[var(--card)] border-[var(--border)]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2 rounded-md bg-[var(--muted)] ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projets récents */}
      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[var(--foreground)]">
              Projets récents
            </CardTitle>
            <Link
              href="/dashboard/projects"
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Voir tout →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {recentProjects?.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)] p-4">
                Aucun projet pour l&apos;instant.
              </p>
            )}
            {recentProjects?.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderKanban size={15} className="text-[var(--muted-foreground)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {project.name}
                    </p>
                    {project.client && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {(project.client as unknown as { full_name: string }).full_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {project.deadline && (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(project.deadline)}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs ${STATUS_COLORS[project.status as ProjectStatus]}`}
                  >
                    {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
