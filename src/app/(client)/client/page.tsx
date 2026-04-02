import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/types'
import { FolderKanban, Calendar, MessageSquare, Package } from 'lucide-react'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  en_brief: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  en_production: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_livraison: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  livre: 'bg-green-500/10 text-green-400 border-green-500/20',
  archive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

export default async function ClientHomePage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // Projets accessibles via client_access OU client_id direct
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
        .select('id, name, status, deadline, brief')
        .in('id', projectIds)
        .neq('status', 'archive')
        .order('updated_at', { ascending: false })
    : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Mes projets</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Suivez l&apos;avancement de vos projets avec Innolive
        </p>
      </div>

      {(!projects || projects.length === 0) && (
        <div className="text-center py-20 text-[var(--muted-foreground)]">
          <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun projet actif pour le moment.</p>
          <p className="text-xs mt-1">Votre responsable Innolive vous donnera accès à vos projets.</p>
        </div>
      )}

      <div className="space-y-3">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4"
          >
            {/* Project header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  {project.name}
                </h2>
                {project.brief && (
                  <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">
                    {project.brief}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${STATUS_COLORS[project.status as ProjectStatus]}`}
              >
                {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
              </Badge>
            </div>

            {project.deadline && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Calendar size={12} />
                Deadline : {formatDate(project.deadline)}
              </div>
            )}

            {/* Links */}
            <div className="flex gap-3 border-t border-[var(--border)] pt-3">
              <Link
                href={`/client/${project.id}/messages`}
                className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
              >
                <MessageSquare size={13} />
                Messages
              </Link>
              <Link
                href={`/client/${project.id}/livraison`}
                className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
              >
                <Package size={13} />
                Livraisons
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
