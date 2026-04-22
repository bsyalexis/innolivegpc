import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { FolderKanban, CheckSquare, Clock, TrendingUp, AlertCircle, DollarSign, Target, Activity } from 'lucide-react'
import DashboardRealtimeRefresh from './DashboardRealtimeRefresh'
import WeeklyTimeline from '@/components/dashboard/WeeklyTimeline'

const STATUS_STYLES: Record<ProjectStatus, { pill: string; dot: string }> = {
  en_brief:      { pill: 'bg-[#f5c51820] text-[#b8930a] border-[#f5c51840]', dot: '#f5c518' },
  en_production: { pill: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]', dot: 'var(--blue)' },
  en_livraison:  { pill: 'bg-[var(--orange-soft)] text-[var(--orange)] border-[#FF4E1C30]', dot: 'var(--orange)' },
  livre:         { pill: 'bg-[#10b98120] text-[#059669] border-[#10b98130]', dot: '#10b981' },
  archive:       { pill: 'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent', dot: '#9ca3af' },
}

const PRIORITY_STYLES: Record<string, { dot: string; bg: string }> = {
  urgente: { dot: '#ef4444', bg: 'bg-red-50 text-red-600 border-red-200' },
  haute:   { dot: 'var(--orange)', bg: 'bg-[var(--orange-soft)] text-[var(--orange)] border-[#FF4E1C30]' },
  normale: { dot: 'var(--blue)', bg: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]' },
  basse:   { dot: '#9ca3af', bg: 'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent' },
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

  const projectsQuery = isAdmin
    ? supabase.from('projects').select('id, status, budget, deadline').neq('status', 'archive')
    : supabase
        .from('project_members')
        .select('project:projects!project_members_project_id_fkey(id, status, budget, deadline)')
        .eq('user_id', authUser.id)

  const recentQuery = isAdmin
    ? supabase
        .from('projects')
        .select('id, name, status, deadline, color, code, client:users!projects_client_id_fkey(full_name)')
        .neq('status', 'archive')
        .order('updated_at', { ascending: false })
        .limit(6)
    : supabase
        .from('project_members')
        .select('project:projects!project_members_project_id_fkey(id, name, status, deadline, color, code, client:users!projects_client_id_fkey(full_name))')
        .eq('user_id', authUser.id)
        .limit(6)

  const urgentTasksQuery = supabase
    .from('tasks')
    .select('id, title, priority, due_date, project_id, project:projects!tasks_project_id_fkey(name)')
    .eq('assignee_id', authUser.id)
    .in('priority', ['urgente', 'haute'])
    .neq('status', 'termine')
    .order('due_date', { ascending: true })
    .limit(6)

  // Flux activité : derniers messages/livraisons créés (ADMIN)
  const activityQuery = isAdmin
    ? supabase
        .from('messages')
        .select('id, content, created_at, thread_type, author:users!messages_author_id_fkey(full_name), project:projects!messages_project_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(5)
    : Promise.resolve({ data: [] })

  const [
    { data: projectsRaw },
    { data: myTasks },
    { data: recentRaw },
    { data: urgentTasksRaw },
    { data: activityRaw },
  ] = await Promise.all([
    projectsQuery,
    supabase.from('tasks').select('id, status').eq('assignee_id', authUser.id).neq('status', 'termine'),
    recentQuery,
    urgentTasksQuery,
    activityQuery,
  ])

  type ProjectRow = { id: string; status: string; budget?: number | null; deadline?: string | null }
  type RecentRow = { id: string; name: string; status: string; deadline?: string | null; color?: string | null; code?: string | null; client?: { full_name: string } | null }
  type UrgentTask = { id: string; title: string; priority: string; due_date: string | null; project_id: string; project?: { name: string } | null }
  type ActivityItem = { id: string; content: string; created_at: string; thread_type: string; author?: { full_name: string } | null; project?: { name: string } | null }

  const projects: ProjectRow[] = isAdmin
    ? (projectsRaw as ProjectRow[] | null) ?? []
    : ((projectsRaw as { project: ProjectRow }[] | null) ?? []).map((r) => r.project)

  const recentProjects: RecentRow[] = isAdmin
    ? (recentRaw as RecentRow[] | null) ?? []
    : ((recentRaw as { project: RecentRow }[] | null) ?? []).map((r) => r.project)

  const urgentTasks: UrgentTask[] = (urgentTasksRaw as UrgentTask[] | null) ?? []
  const activity: ActivityItem[] = (activityRaw as ActivityItem[] | null) ?? []

  const statusCounts = (projects || []).reduce((acc, p) => {
    acc[p.status as ProjectStatus] = (acc[p.status as ProjectStatus] || 0) + 1
    return acc
  }, {} as Record<ProjectStatus, number>)

  // CA en production
  const caProduction = projects
    .filter((p) => p.status === 'en_production')
    .reduce((acc, p) => acc + (p.budget ?? 0), 0)

  // Taux deadlines respectées (projets livrés avec deadline)
  const { data: livresRaw } = await supabase
    .from('projects')
    .select('deadline, updated_at')
    .eq('status', 'livre')
    .not('deadline', 'is', null)
    .limit(50)

  const livres = livresRaw ?? []
  const onTime = livres.filter((p) => new Date(p.updated_at) <= new Date(p.deadline)).length
  const tauxDeadlines = livres.length > 0 ? Math.round((onTime / livres.length) * 100) : null

  const firstName = currentUser?.full_name?.split(' ')[0] ?? 'vous'

  const fmtEur = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}k€` : `${n}€`

  const kpis = [
    {
      label: isAdmin ? 'Projets actifs' : 'Mes projets',
      value: projects?.length ?? 0,
      iconBg: 'var(--blue)',
      icon: <FolderKanban size={20} color="white" />,
    },
    {
      label: 'Mes tâches en cours',
      value: myTasks?.length ?? 0,
      iconBg: 'var(--ink)',
      icon: <CheckSquare size={20} color="white" />,
    },
    {
      label: isAdmin && caProduction > 0 ? 'CA en production' : 'En production',
      value: isAdmin && caProduction > 0 ? fmtEur(caProduction) : (statusCounts['en_production'] ?? 0),
      iconBg: 'var(--orange)',
      icon: isAdmin && caProduction > 0 ? <DollarSign size={20} color="white" /> : <TrendingUp size={20} color="white" />,
    },
    {
      label: isAdmin && tauxDeadlines !== null ? 'Taux deadlines' : 'En livraison',
      value: isAdmin && tauxDeadlines !== null ? `${tauxDeadlines}%` : (statusCounts['en_livraison'] ?? 0),
      iconBg: '#10b981',
      icon: isAdmin && tauxDeadlines !== null ? <Target size={20} color="white" /> : <Clock size={20} color="white" />,
    },
  ]

  return (
    <div className="space-y-6">
      <DashboardRealtimeRefresh userId={authUser.id} />

      {/* Hero greeting */}
      <div className="mb-2">
        <p className="text-[11px] text-[var(--muted-foreground)] tracking-widest uppercase mb-2">
          {isAdmin ? "Vue d'ensemble · Innolive" : 'Mon espace'}
        </p>
        <h1 className="headline text-[44px] leading-[0.95] uppercase">
          Bonjour,&nbsp;
          <span className="highlight-blue">{firstName}</span>
        </h1>
        <h2 className="headline text-[44px] leading-[0.95] uppercase mt-1">
          {projects.length}&nbsp;
          <span className="highlight-orange">projet{projects.length > 1 ? 's' : ''}</span>
          &nbsp;actif{projects.length > 1 ? 's' : ''}.
        </h2>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, iconBg, icon }) => (
          <div
            key={label}
            className="bg-[var(--card)] rounded-[22px] border border-[var(--border)] p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: iconBg }}
              >
                {icon}
              </div>
            </div>
            <div>
              <p className="headline text-[34px] leading-none">{value}</p>
              <p className="text-[13px] text-[var(--muted-foreground)] mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline hebdomadaire */}
      <WeeklyTimeline userId={authUser.id} isAdmin={isAdmin} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Projets récents */}
        <div className="bg-[var(--card)] rounded-[22px] border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="headline text-[18px] uppercase">
              Projets <span className="text-[var(--muted-foreground)]">récents</span>
            </h3>
            <Link
              href="/dashboard/projects"
              className="text-[12px] font-semibold text-[var(--blue)] hover:opacity-70 transition-opacity flex items-center gap-1"
            >
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentProjects?.length === 0 && (
              <p className="text-[13px] text-[var(--muted-foreground)] p-5">
                Aucun projet pour l&apos;instant.
              </p>
            )}
            {recentProjects?.map((project) => {
              const style = STATUS_STYLES[project.status as ProjectStatus]
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: style?.dot ?? '#9ca3af' }}
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--foreground)] truncate group-hover:text-[var(--blue)] transition-colors">
                        {project.name}
                      </p>
                      {project.client && (
                        <p className="text-[12px] text-[var(--muted-foreground)]">
                          {(project.client as unknown as { full_name: string }).full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {project.deadline && (
                      <span className="text-[12px] text-[var(--muted-foreground)]">
                        {formatDate(project.deadline)}
                      </span>
                    )}
                    <span className={`pill text-[11px] border ${style?.pill ?? ''}`}>
                      {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Tâches urgentes */}
        <div className="bg-[var(--card)] rounded-[22px] border border-[var(--border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border)]">
            <AlertCircle size={16} style={{ color: 'var(--orange)' }} />
            <h3 className="headline text-[18px] uppercase">
              Tâches <span className="text-[var(--muted-foreground)]">prioritaires</span>
            </h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {urgentTasks.length === 0 && (
              <p className="text-[13px] text-[var(--muted-foreground)] p-5">
                Aucune tâche prioritaire en cours.
              </p>
            )}
            {urgentTasks.map((task) => {
              const style = PRIORITY_STYLES[task.priority]
              return (
                <Link
                  key={task.id}
                  href={`/dashboard/projects/${task.project_id}/tasks`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: style?.dot ?? '#9ca3af' }}
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--foreground)] truncate">
                        {task.title}
                      </p>
                      {task.project && (
                        <p className="text-[12px] text-[var(--muted-foreground)]">
                          {(task.project as unknown as { name: string }).name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {task.due_date && (
                      <span className="text-[12px] text-[var(--muted-foreground)]">
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    <span className={`pill text-[11px] border capitalize ${style?.bg ?? ''}`}>
                      {task.priority}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Flux activité équipe (ADMIN only) */}
      {isAdmin && activity.length > 0 && (
        <div className="bg-[var(--card)] rounded-[22px] border border-[var(--border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border)]">
            <Activity size={16} style={{ color: 'var(--blue)' }} />
            <h3 className="headline text-[18px] uppercase">
              Activité <span className="text-[var(--muted-foreground)]">équipe</span>
            </h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activity.map((item) => {
              const author = (item.author as unknown as { full_name: string } | null)?.full_name ?? '—'
              const project = (item.project as unknown as { name: string } | null)?.name
              return (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--blue)] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                    {author.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold">{author}</p>
                      <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">
                        {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--muted-foreground)] truncate">{item.content}</p>
                    {project && <p className="text-[11px] text-[var(--blue)] mt-0.5">{project}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bandeau performance style Innolive */}
      <div
        className="rounded-[22px] px-7 py-7 relative overflow-hidden"
        style={{ background: 'var(--ink)', color: 'white' }}
      >
        <div className="relative z-10 flex items-center gap-8">
          <div className="flex-1">
            <p className="text-[11px] tracking-widest uppercase opacity-50 mb-2">Innolive · Agence</p>
            <h2 className="headline text-[28px] leading-tight">
              Gérez vos projets avec{' '}
              <span className="highlight-blue">précision</span>
              <span className="opacity-50"> & </span>
              <span className="highlight-orange">impact</span>.
            </h2>
          </div>
          <Link
            href="/dashboard/projects"
            className="shrink-0 px-5 py-3 rounded-full bg-white text-[var(--ink)] font-bold text-[13px] hover:opacity-90 transition-opacity"
          >
            Voir les projets →
          </Link>
        </div>

        {/* Ghost word */}
        <div
          className="ghost-word absolute right-0 top-1/2 -translate-y-1/2 text-[120px] select-none pointer-events-none"
          style={{ WebkitTextStroke: '1px rgba(255,255,255,0.05)', color: 'transparent' }}
        >
          INNOLIVE
        </div>
      </div>
    </div>
  )
}
