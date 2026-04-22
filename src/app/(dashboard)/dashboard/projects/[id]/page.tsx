import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import {
  PROJECT_STATUS_LABELS,
  PROJECT_CATEGORY_LABELS,
  type ProjectStatus,
} from '@/types'
import {
  ArrowLeft,
  MessageSquare,
  Package,
  CheckSquare,
  Calendar,
  Edit,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Sparkles,
  Tag,
} from 'lucide-react'
import ProjectStatusSelector from '@/components/projects/ProjectStatusSelector'
import ProjectDetailTabs from '@/components/projects/ProjectDetailTabs'

const STATUS_STYLES: Record<ProjectStatus, { pill: string; dot: string }> = {
  en_brief:      { pill: 'bg-[#f5c51820] text-[#b8930a] border-[#f5c51840]',              dot: '#f5c518' },
  en_production: { pill: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]',    dot: 'var(--blue)' },
  en_livraison:  { pill: 'bg-[var(--orange-soft)] text-[var(--orange)] border-[#FF4E1C30]', dot: 'var(--orange)' },
  livre:         { pill: 'bg-[#10b98120] text-[#059669] border-[#10b98130]',               dot: '#10b981' },
  archive:       { pill: 'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent', dot: '#9ca3af' },
}

const TIMELINE_STEPS = [
  { key: 'en_brief',      label: 'Brief' },
  { key: 'en_production', label: 'Production' },
  { key: 'en_livraison',  label: 'Revue' },
  { key: 'livre',         label: 'Livraison' },
]

const STEP_ORDER: Record<string, number> = {
  en_brief: 0, en_production: 1, en_livraison: 2, livre: 3, archive: 3,
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
      members:project_members(user:users(id, full_name, role, avatar_url))
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
      .select('id, title, status, priority, due_date, assignee:users(id, full_name, avatar_url)')
      .eq('project_id', id)
      .order('position'),
    supabase
      .from('messages')
      .select('id, content, thread_type, created_at, author:users(full_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('deliveries')
      .select('id, title, status, drive_folder_url, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  const accent = project.color ?? 'var(--blue)'
  const statusStyle = STATUS_STYLES[project.status as ProjectStatus]
  const currentStep = STEP_ORDER[project.status] ?? 0
  const tasksDone = (tasks ?? []).filter((t) => t.status === 'termine').length
  const tasksTotal = (tasks ?? []).length
  const progress = project.progress ?? (tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0)

  type Member = { user: { id: string; full_name: string; role: string; avatar_url: string | null } }
  const members = (project.members as Member[]) ?? []
  const lead = project.lead_id
    ? members.find((m) => m.user.id === project.lead_id)?.user
    : null

  return (
    <div className="space-y-0">
      {/* Header immersif */}
      <div
        className="relative rounded-[22px] overflow-hidden mb-6"
        style={{ background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`, border: `1px solid ${accent}30` }}
      >
        {/* Bande accent */}
        <div className="h-1 w-full" style={{ background: accent }} />

        <div className="p-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-5">
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-1.5 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft size={14} />
              Projets
            </Link>
            <div className="flex items-center gap-2">
              <ProjectStatusSelector projectId={id} currentStatus={project.status} />
              <Link
                href={`/dashboard/projects/${id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <Edit size={12} />
                Modifier
              </Link>
            </div>
          </div>

          {/* Titre */}
          <div className="mb-4">
            {project.code && (
              <p className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color: accent }}>
                {project.code}
                {project.category && ` · ${PROJECT_CATEGORY_LABELS[project.category as keyof typeof PROJECT_CATEGORY_LABELS]}`}
              </p>
            )}
            <h1 className="headline text-[36px] leading-tight uppercase mb-2">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`pill text-[11px] border ${statusStyle.pill}`}>
                {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
              </span>
              {project.deadline && (
                <span className="flex items-center gap-1 text-[12px] text-[var(--muted-foreground)]">
                  <Calendar size={11} />
                  {formatDate(project.deadline)}
                </span>
              )}
              {project.budget && (
                <span className="flex items-center gap-1 text-[12px] font-semibold text-[var(--foreground)]">
                  <DollarSign size={11} />
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(project.budget)}
                </span>
              )}
              {project.tags && project.tags.length > 0 && project.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--chip)] text-[var(--muted-foreground)] border border-[var(--border)]">
                  <Tag size={8} />{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Timeline 4 étapes */}
          <div className="flex items-center gap-0 mt-2">
            {TIMELINE_STEPS.map((step, i) => {
              const done = i < currentStep
              const active = i === currentStep
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all"
                      style={{
                        background: done || active ? accent : 'var(--muted)',
                        borderColor: done || active ? accent : 'var(--border)',
                        color: done || active ? 'white' : 'var(--muted-foreground)',
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <span
                      className="text-[10px] font-medium text-center"
                      style={{ color: active ? accent : done ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      className="h-0.5 flex-1 mx-1 rounded-full transition-all"
                      style={{ background: i < currentStep ? accent : 'var(--border)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Progression */}
          {progress > 0 && (
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1 text-[var(--muted-foreground)]"><TrendingUp size={11} /> Progression globale</span>
                <span className="font-bold" style={{ color: accent }}>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: accent }} />
              </div>
            </div>
          )}

          {/* Équipe */}
          {members.length > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
              <Users size={13} className="text-[var(--muted-foreground)]" />
              <div className="flex items-center gap-2 flex-wrap">
                {members.map(({ user: member }) => (
                  <span
                    key={member.id}
                    className="text-[12px] px-2.5 py-1 rounded-full border font-medium transition-colors"
                    style={{
                      background: member.id === project.lead_id ? `${accent}20` : 'var(--chip)',
                      borderColor: member.id === project.lead_id ? `${accent}40` : 'var(--border)',
                      color: member.id === project.lead_id ? accent : 'var(--foreground)',
                    }}
                  >
                    {member.full_name}
                    {member.id === project.lead_id && <span className="ml-1 text-[10px] opacity-70">Lead</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onglets */}
      <ProjectDetailTabs
        projectId={id}
        projectName={project.name}
        brief={project.brief}
        accent={accent}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tasks={(tasks ?? []) as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages={(recentMessages ?? []) as any}
        deliveries={deliveries ?? []}
        client={project.client as { id: string; full_name: string; email: string } | null}
        lead={lead}
        budget={project.budget}
        tasksStats={{ done: tasksDone, total: tasksTotal }}
      />
    </div>
  )
}
