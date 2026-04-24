import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { DELIVERY_STATUS_LABELS, type DeliveryStatus } from '@/types'
import {
  Package,
  ExternalLink,
  FolderOpen,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react'

const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  en_attente: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  valide: 'bg-green-500/10 text-green-400 border-green-500/20',
  revision_demandee: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const DELIVERY_STATUS_ICONS: Record<DeliveryStatus, React.ReactNode> = {
  en_attente: <Clock size={12} className="text-zinc-400" />,
  valide: <CheckCircle2 size={12} className="text-green-400" />,
  revision_demandee: <RotateCcw size={12} className="text-orange-400" />,
}

type DeliveryRow = {
  id: string
  title: string
  drive_folder_url: string
  status: string
  created_at: string
  project_id: string
  project: { id: string; name: string } | null
}

export default async function ClientDocumentsPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser || currentUser.role !== 'CLIENT') redirect('/dashboard')

  // Récupère tous les projets accessibles
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

  const { data: deliveries } = projectIds.length
    ? await supabase
        .from('deliveries')
        .select(`
          id, title, drive_folder_url, status, created_at, project_id,
          project:projects(id, name)
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Grouper par projet
  const byProject = new Map<string, { projectName: string; projectId: string; items: DeliveryRow[] }>()

  for (const d of (deliveries ?? []) as unknown as DeliveryRow[]) {
    const pid = d.project_id
    const projectName = (d.project as { id: string; name: string } | null)?.name ?? 'Projet inconnu'
    if (!byProject.has(pid)) {
      byProject.set(pid, { projectName, projectId: pid, items: [] })
    }
    byProject.get(pid)!.items.push(d)
  }

  const totalDocs = deliveries?.length ?? 0
  const validatedDocs = deliveries?.filter((d) => d.status === 'valide').length ?? 0
  const pendingDocs = deliveries?.filter((d) => d.status === 'en_attente').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Documents</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Toutes vos livraisons et fichiers partagés par Innolive
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--foreground)]">{totalDocs}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">document{totalDocs > 1 ? 's' : ''} au total</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{validatedDocs}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">validé{validatedDocs > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--muted-foreground)]">{pendingDocs}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">en attente</p>
        </div>
      </div>

      {/* Documents par projet */}
      {byProject.size === 0 ? (
        <div className="text-center py-16 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <FolderOpen size={36} className="mx-auto mb-3 opacity-30 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Aucun document disponible pour le moment.</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Votre équipe Innolive partagera vos fichiers ici.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byProject.values()).map(({ projectName, projectId, items }) => (
            <div key={projectId} className="space-y-3">
              {/* Projet header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-[var(--primary)]" />
                  <Link
                    href={`/client/${projectId}`}
                    className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                  >
                    {projectName}
                  </Link>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    ({items.length} fichier{items.length > 1 ? 's' : ''})
                  </span>
                </div>
                <Link
                  href={`/client/${projectId}/livraison`}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Gérer →
                </Link>
              </div>

              {/* Items list */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                {items.map((delivery, index) => (
                  <div
                    key={delivery.id}
                    className={`flex items-center gap-4 px-5 py-4 ${
                      index < items.length - 1 ? 'border-b border-[var(--border)]' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-[var(--primary)]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {delivery.title}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Partagé le {formatDate(delivery.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {DELIVERY_STATUS_ICONS[delivery.status as DeliveryStatus]}
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 ${DELIVERY_STATUS_COLORS[delivery.status as DeliveryStatus]}`}
                        >
                          {DELIVERY_STATUS_LABELS[delivery.status as DeliveryStatus]}
                        </Badge>
                      </div>
                      <a
                        href={delivery.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
                      >
                        <ExternalLink size={12} />
                        Ouvrir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
