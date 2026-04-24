import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/types'
import {
  FolderKanban,
  Calendar,
  Package,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  en_brief: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  en_production: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_livraison: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  livre: 'bg-green-500/10 text-green-400 border-green-500/20',
  archive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  en_brief: 10,
  en_production: 45,
  en_livraison: 80,
  livre: 100,
  archive: 100,
}

export default async function ClientHomePage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', authUser.id)
    .single()

  // Projets accessibles
  const { data: accessList } = await supabase
    .from('client_access')
    .select('project_id')
    .eq('client_id', authUser.id)

  const { data: directProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', authUser.id)

  const projectIds = [
    ...new Set([
      ...(accessList || []).map((a) => a.project_id),
      ...(directProjects || []).map((p) => p.id),
    ]),
  ]

  const { data: projects } = projectIds.length
    ? await supabase
        .from('projects')
        .select('id, name, status, deadline, brief, progress, color, category')
        .in('id', projectIds)
        .neq('status', 'archive')
        .order('updated_at', { ascending: false })
    : { data: [] }

  // Livraisons récentes (toutes les livraisons de tous les projets)
  const { data: recentDeliveries } = projectIds.length
    ? await supabase
        .from('deliveries')
        .select('id, title, status, created_at, project_id, projects(name)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(3)
    : { data: [] }

  // Messages non lus (thread client)
  const { count: unreadMessages } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', authUser.id)
    .eq('type', 'nouveau_message')
    .eq('read', false)

  const activeProjects = projects?.filter((p) => p.status !== 'livre') ?? []
  const deliveredProjects = projects?.filter((p) => p.status === 'livre') ?? []

  const firstName = currentUser?.full_name?.split(' ')[0] ?? 'Client'

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Bonjour, {firstName} 👋
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Voici l&apos;état de vos projets avec Innolive
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp size={14} className="text-blue-400" />
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">En cours</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{activeProjects.length}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {activeProjects.length === 1 ? 'projet actif' : 'projets actifs'}
          </p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-green-400" />
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">Livrés</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{deliveredProjects.length}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {deliveredProjects.length === 1 ? 'projet livré' : 'projets livrés'}
          </p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <MessageSquare size={14} className="text-orange-400" />
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">Messages</span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{unreadMessages ?? 0}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">non lus</p>
        </div>
      </div>

      {/* Projects list */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          Mes projets
        </h2>

        {(!projects || projects.length === 0) && (
          <div className="text-center py-16 text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-xl">
            <FolderKanban size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun projet actif pour le moment.</p>
            <p className="text-xs mt-1">Votre responsable Innolive vous donnera accès à vos projets.</p>
          </div>
        )}

        <div className="space-y-3">
          {projects?.map((project) => {
            const statusProgress = project.progress ?? STATUS_PROGRESS[project.status as ProjectStatus]
            return (
              <Link
                key={project.id}
                href={`/client/${project.id}`}
                className="block bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--primary)]/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {project.color && (
                      <div
                        className="w-1 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
                        {project.name}
                      </h3>
                      {project.brief && (
                        <p className="text-sm text-[var(--muted-foreground)] mt-0.5 line-clamp-1">
                          {project.brief}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_COLORS[project.status as ProjectStatus]}`}
                    >
                      {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
                    </Badge>
                    <ArrowRight size={14} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>Avancement</span>
                    <span className="font-medium text-[var(--foreground)]">{statusProgress}%</span>
                  </div>
                  <Progress value={statusProgress} className="h-1.5" />
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
                  {project.deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                      <Calendar size={11} />
                      {formatDate(project.deadline)}
                    </div>
                  )}
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                      <MessageSquare size={11} />
                      Messages
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                      <Package size={11} />
                      Livraisons
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent deliveries */}
      {recentDeliveries && recentDeliveries.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
              Livraisons récentes
            </h2>
            <Link href="/client/documents" className="text-xs text-[var(--primary)] hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {(recentDeliveries as unknown as {
              id: string
              title: string
              status: string
              created_at: string
              project_id: string
              projects: { name: string } | null
            }[]).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Package size={14} className="text-[var(--muted-foreground)] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{d.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {(d.projects as { name: string } | null)?.name} · {formatDate(d.created_at)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    d.status === 'valide'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : d.status === 'revision_demandee'
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                  }`}
                >
                  {d.status === 'valide' ? 'Validé' : d.status === 'revision_demandee' ? 'Révision' : 'En attente'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming deadlines */}
      {projects && projects.some((p) => p.deadline) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
            Prochaines échéances
          </h2>
          <div className="space-y-2">
            {projects
              .filter((p) => p.deadline && p.status !== 'livre')
              .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
              .slice(0, 3)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/client/${p.id}`}
                  className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 hover:border-[var(--primary)]/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-[var(--muted-foreground)]" />
                    <span className="text-sm text-[var(--foreground)]">{p.name}</span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">{formatDate(p.deadline!)}</span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
