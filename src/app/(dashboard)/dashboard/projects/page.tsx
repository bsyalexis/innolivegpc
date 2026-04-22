import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/types'

const STATUS_STYLES: Record<ProjectStatus, { pill: string; dot: string; accent: string }> = {
  en_brief:      { pill: 'bg-[#f5c51820] text-[#b8930a] border-[#f5c51840]',             dot: '#f5c518',       accent: '#f5c518' },
  en_production: { pill: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]',   dot: 'var(--blue)',   accent: 'var(--blue)' },
  en_livraison:  { pill: 'bg-[var(--orange-soft)] text-[var(--orange)] border-[#FF4E1C30]', dot: 'var(--orange)', accent: 'var(--orange)' },
  livre:         { pill: 'bg-[#10b98120] text-[#059669] border-[#10b98130]',              dot: '#10b981',       accent: '#10b981' },
  archive:       { pill: 'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent', dot: '#9ca3af',  accent: '#9ca3af' },
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

  const total = projects?.length ?? 0

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div>
        <p className="text-[11px] text-[var(--muted-foreground)] tracking-widest uppercase mb-2">
          {total} projet{total > 1 ? 's' : ''} · toutes catégories
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

      {/* Groupes par statut */}
      {statusOrder.map((status) => {
        const list = grouped[status]
        if (!list || list.length === 0) return null
        const style = STATUS_STYLES[status]
        return (
          <div key={status}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: style.dot }} />
              <span className="headline text-[15px] uppercase tracking-wide">
                {PROJECT_STATUS_LABELS[status]}
              </span>
              <span className={`pill text-[11px] border ${style.pill}`}>
                {list.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.map((project) => {
                const clientName = (project.client as unknown as { full_name: string } | null)?.full_name
                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="group bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden transition-transform hover:-translate-y-0.5"
                    style={{ boxShadow: '0 2px 8px rgba(10,10,10,0.04)' }}
                  >
                    <div className="h-1.5 w-full" style={{ background: style.accent }} />
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="headline text-[16px] uppercase leading-tight line-clamp-2 group-hover:text-[var(--blue)] transition-colors">
                          {project.name}
                        </h3>
                        <span className={`pill text-[11px] border shrink-0 ${style.pill}`}>
                          {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
                        </span>
                      </div>

                      {project.brief && (
                        <p className="text-[12px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                          {project.brief}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[12px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
                        {clientName ? (
                          <div className="flex items-center gap-1.5">
                            <User size={11} />
                            <span className="truncate max-w-[130px]">{clientName}</span>
                          </div>
                        ) : <span />}
                        {project.deadline && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} />
                            <span>{formatDate(project.deadline)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {(!projects || projects.length === 0) && (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--muted-foreground)]">
          <div className="ghost-word text-[80px] leading-none mb-4">VIDE</div>
          <p className="text-[14px] mb-6">Aucun projet pour l&apos;instant.</p>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--ink)] text-white text-[13px] font-semibold transition-transform hover:-translate-y-px"
          >
            <Plus size={15} />
            Créer le premier projet
          </Link>
        </div>
      )}
    </div>
  )
}
