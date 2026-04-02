import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'
import {
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  type ProjectStatus,
  type TaskStatus,
} from '@/types'
import {
  ArrowLeft,
  MessageSquare,
  Package,
  CheckSquare,
  Calendar,
  User,
  Edit,
} from 'lucide-react'
import ProjectStatusSelector from '@/components/projects/ProjectStatusSelector'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  en_brief: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  en_production: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_livraison: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  livre: 'bg-green-500/10 text-green-400 border-green-500/20',
  archive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

const TASK_COLORS: Record<TaskStatus, string> = {
  a_faire: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  en_cours: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bloque: 'bg-red-500/10 text-red-400 border-red-500/20',
  termine: 'bg-green-500/10 text-green-400 border-green-500/20',
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      client:users!projects_client_id_fkey(id, full_name, email),
      members:project_members(user:users(id, full_name, role))
    `)
    .eq('id', id)
    .single()

  if (!project) notFound()

  const [
    { data: tasks },
    { data: recentMessages },
    { data: deliveries },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, assignee:users(full_name)')
      .eq('project_id', id)
      .order('position'),
    supabase
      .from('messages')
      .select('id, content, thread_type, created_at, author:users(full_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('deliveries')
      .select('id, title, status, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  const taskStats = (tasks || []).reduce((acc, t) => {
    acc[t.status as TaskStatus] = (acc[t.status as TaskStatus] || 0) + 1
    return acc
  }, {} as Record<TaskStatus, number>)

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mt-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Link href="/dashboard/projects">
              <ArrowLeft size={15} />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {project.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge
                variant="outline"
                className={`text-xs ${STATUS_COLORS[project.status as ProjectStatus]}`}
              >
                {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
              </Badge>
              {project.deadline && (
                <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                  <Calendar size={11} />
                  {formatDate(project.deadline)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ProjectStatusSelector projectId={id} currentStatus={project.status} />
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Link href={`/dashboard/projects/${id}/edit`}>
              <Edit size={14} className="mr-1" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      {/* Brief */}
      {project.brief && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
          <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
            Brief
          </h2>
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
            {project.brief}
          </p>
        </div>
      )}

      {/* Client + Équipe */}
      <div className="grid grid-cols-2 gap-4">
        {project.client && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
              Client
            </h2>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                <User size={14} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {(project.client as { full_name: string }).full_name}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {(project.client as { email: string }).email}
                </p>
              </div>
            </div>
          </div>
        )}

        {(project.members as { user: { id: string; full_name: string } }[])?.length > 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
              Équipe assignée
            </h2>
            <div className="flex flex-wrap gap-2">
              {(project.members as { user: { id: string; full_name: string } }[]).map(
                ({ user: member }) => (
                  <span
                    key={member.id}
                    className="text-xs bg-[var(--muted)] border border-[var(--border)] px-2.5 py-1 rounded-full text-[var(--foreground)]"
                  >
                    {member.full_name}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-[var(--border)]" />

      {/* Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tâches */}
        <Link
          href={`/dashboard/projects/${id}/tasks`}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)]/40 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <CheckSquare size={15} className="text-blue-400" />
              Tâches
            </h2>
            <span className="text-xs text-[var(--primary)] group-hover:underline">
              Voir →
            </span>
          </div>
          <div className="space-y-1">
            {(Object.keys(taskStats) as TaskStatus[]).map((s) => (
              <div key={s} className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`text-xs ${TASK_COLORS[s]}`}
                >
                  {TASK_STATUS_LABELS[s]}
                </Badge>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {taskStats[s]}
                </span>
              </div>
            ))}
            {tasks?.length === 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">Aucune tâche</p>
            )}
          </div>
        </Link>

        {/* Messages */}
        <Link
          href={`/dashboard/projects/${id}/messages`}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)]/40 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <MessageSquare size={15} className="text-green-400" />
              Messagerie
            </h2>
            <span className="text-xs text-[var(--primary)] group-hover:underline">
              Voir →
            </span>
          </div>
          <div className="space-y-2">
            {recentMessages?.slice(0, 2).map((msg) => (
              <div key={msg.id} className="text-xs">
                <span className="text-[var(--muted-foreground)]">
                  {(msg.author as unknown as { full_name: string })?.full_name}
                </span>
                <p className="text-[var(--foreground)] truncate mt-0.5">{msg.content}</p>
              </div>
            ))}
            {!recentMessages?.length && (
              <p className="text-xs text-[var(--muted-foreground)]">Aucun message</p>
            )}
          </div>
        </Link>

        {/* Livraisons */}
        <Link
          href={`/dashboard/projects/${id}/delivery`}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)]/40 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Package size={15} className="text-purple-400" />
              Livraisons
            </h2>
            <span className="text-xs text-[var(--primary)] group-hover:underline">
              Voir →
            </span>
          </div>
          <div className="space-y-1.5">
            {deliveries?.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <span className="text-[var(--foreground)] truncate">{d.title}</span>
                <Badge
                  variant="outline"
                  className={`ml-2 shrink-0 text-[10px] ${
                    d.status === 'valide'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : d.status === 'revision_demandee'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}
                >
                  {d.status === 'valide'
                    ? 'Validé'
                    : d.status === 'revision_demandee'
                    ? 'Révision'
                    : 'En attente'}
                </Badge>
              </div>
            ))}
            {!deliveries?.length && (
              <p className="text-xs text-[var(--muted-foreground)]">Aucune livraison</p>
            )}
          </div>
        </Link>
      </div>
    </div>
  )
}
