import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, DELIVERY_STATUS_LABELS, type ProjectStatus, type DeliveryStatus } from '@/types'
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Package,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Tag,
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

const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  en_attente: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  valide: 'bg-green-500/10 text-green-400 border-green-500/20',
  revision_demandee: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const STEPS: { status: ProjectStatus; label: string }[] = [
  { status: 'en_brief', label: 'Brief' },
  { status: 'en_production', label: 'Production' },
  { status: 'en_livraison', label: 'Livraison' },
  { status: 'livre', label: 'Livré' },
]

const STATUS_ORDER: Record<ProjectStatus, number> = {
  en_brief: 0,
  en_production: 1,
  en_livraison: 2,
  livre: 3,
  archive: 4,
}

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser || currentUser.role !== 'CLIENT') redirect('/dashboard')

  const { data: project } = await supabase
    .from('projects')
    .select(`
      id, name, brief, status, deadline, progress, color, category, code, budget, tags,
      lead:users!projects_lead_id_fkey(full_name)
    `)
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select(`
      id, title, drive_folder_url, status, created_at, expires_at,
      created_by_user:users!deliveries_created_by_fkey(full_name),
      feedback:delivery_feedback(id, comment, created_at, author:users(full_name))
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  const { data: recentMessages } = await supabase
    .from('messages')
    .select(`id, content, created_at, author:users(full_name)`)
    .eq('project_id', projectId)
    .eq('thread_type', 'client')
    .order('created_at', { ascending: false })
    .limit(3)

  const statusProgress = project.progress ?? STATUS_PROGRESS[project.status as ProjectStatus]
  const currentStatusOrder = STATUS_ORDER[project.status as ProjectStatus]

  const validatedDeliveries = deliveries?.filter((d) => d.status === 'valide').length ?? 0
  const pendingDeliveries = deliveries?.filter((d) => d.status === 'en_attente').length ?? 0

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] shrink-0"
        >
          <Link href="/client">
            <ArrowLeft size={15} />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {project.code && (
              <span className="text-xs font-mono text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] px-2 py-0.5 rounded">
                {project.code}
              </span>
            )}
            <h1 className="text-xl font-bold text-[var(--foreground)] truncate">{project.name}</h1>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-xs shrink-0 ${STATUS_COLORS[project.status as ProjectStatus]}`}
        >
          {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
        </Badge>
      </div>

      {/* Progress stepper */}
      {project.status !== 'archive' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span className="font-medium text-[var(--foreground)]">Avancement du projet</span>
            <span className="font-semibold text-[var(--foreground)]">{statusProgress}%</span>
          </div>
          <Progress value={statusProgress} className="h-2" />

          {/* Étapes */}
          <div className="flex items-center gap-1 mt-2">
            {STEPS.map((step, index) => {
              const stepOrder = STATUS_ORDER[step.status]
              const isDone = stepOrder < currentStatusOrder
              const isCurrent = step.status === project.status
              const isFuture = stepOrder > currentStatusOrder
              return (
                <div key={step.status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isDone
                          ? 'bg-green-500/20 text-green-400'
                          : isCurrent
                          ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                          : 'bg-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={14} /> : index + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-medium ${
                        isCurrent ? 'text-[var(--primary)]' : isFuture ? 'text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-px flex-1 mx-1 ${
                        isDone ? 'bg-green-500/40' : 'bg-[var(--border)]'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 pt-2 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] flex-wrap">
            {project.deadline && (
              <div className="flex items-center gap-1.5">
                <Calendar size={11} />
                Deadline : {formatDate(project.deadline)}
              </div>
            )}
            {(project.lead as unknown as { full_name: string } | null)?.full_name && (
              <div className="flex items-center gap-1.5">
                <User size={11} />
                Chef de projet : {(project.lead as unknown as { full_name: string }).full_name}
              </div>
            )}
            {project.budget && (
              <div className="flex items-center gap-1.5">
                <Tag size={11} />
                Budget : {Number(project.budget).toLocaleString('fr-FR')} €
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brief */}
      {project.brief && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Brief du projet</h2>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed whitespace-pre-wrap">
            {project.brief}
          </p>
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border)]">
              {(project.tags as string[]).map((tag: string) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2-col: deliveries + messages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Livraisons */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-[var(--primary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Livraisons</h2>
            </div>
            <Link
              href={`/client/${projectId}/livraison`}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Gérer →
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle2 size={11} />
              {validatedDeliveries} validé{validatedDeliveries > 1 ? 's' : ''}
            </div>
            {pendingDeliveries > 0 && (
              <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                <Clock size={11} />
                {pendingDeliveries} en attente
              </div>
            )}
          </div>

          {(!deliveries || deliveries.length === 0) ? (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-4">
              Aucune livraison pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {deliveries.slice(0, 3).map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-start justify-between gap-2 py-2 border-b border-[var(--border)] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground)] truncate">{delivery.title}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      {formatDate(delivery.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 ${DELIVERY_STATUS_COLORS[delivery.status as DeliveryStatus]}`}
                    >
                      {DELIVERY_STATUS_LABELS[delivery.status as DeliveryStatus]}
                    </Badge>
                    <a
                      href={delivery.drive_folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                      title="Ouvrir dans Drive"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
              {deliveries.length > 3 && (
                <Link href={`/client/${projectId}/livraison`} className="text-xs text-[var(--primary)] hover:underline block text-center pt-1">
                  Voir les {deliveries.length - 3} autres
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Messages récents */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-[var(--primary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Messages</h2>
            </div>
            <Link
              href={`/client/${projectId}/messages`}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Ouvrir →
            </Link>
          </div>

          {(!recentMessages || recentMessages.length === 0) ? (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-4">
              Aucun message pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {recentMessages.map((msg) => {
                const author = msg.author as unknown as { full_name: string } | null
                return (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                      <span className="font-medium text-[var(--foreground)]">{author?.full_name}</span>
                      <span>·</span>
                      <span>{formatDate(msg.created_at)}</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{msg.content}</p>
                  </div>
                )
              })}
              <Link
                href={`/client/${projectId}/messages`}
                className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline pt-1"
              >
                <MessageSquare size={11} />
                Répondre ou voir tout
              </Link>
            </div>
          )}

          {recentMessages && recentMessages.length === 0 && (
            <Button asChild size="sm" className="w-full mt-2">
              <Link href={`/client/${projectId}/messages`}>
                <MessageSquare size={13} className="mr-1.5" />
                Démarrer la conversation
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Alertes */}
      {deliveries?.some((d) => d.status === 'en_attente') && (
        <div className="flex items-start gap-3 bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
          <AlertCircle size={15} className="text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-400">Action requise</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {pendingDeliveries} livraison{pendingDeliveries > 1 ? 's' : ''} en attente de validation.{' '}
              <Link href={`/client/${projectId}/livraison`} className="text-[var(--primary)] hover:underline">
                Voir les livraisons
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
