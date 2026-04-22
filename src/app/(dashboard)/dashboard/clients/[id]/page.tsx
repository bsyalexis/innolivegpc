import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, getInitials } from '@/lib/utils'
import { ArrowLeft, Building2, MapPin, Mail, Phone, Globe, Calendar, FolderKanban, TrendingUp, DollarSign } from 'lucide-react'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/types'
import ClientPortalWidget from '@/components/clients/ClientPortalWidget'

const STATUS_STYLES: Record<ProjectStatus, { pill: string; dot: string }> = {
  en_brief:      { pill: 'bg-[#f5c51820] text-[#b8930a] border-[#f5c51840]',              dot: '#f5c518' },
  en_production: { pill: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]',    dot: 'var(--blue)' },
  en_livraison:  { pill: 'bg-[var(--orange-soft)] text-[var(--orange)] border-[#FF4E1C30]', dot: 'var(--orange)' },
  livre:         { pill: 'bg-[#10b98120] text-[#059669] border-[#10b98130]',               dot: '#10b981' },
  archive:       { pill: 'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent', dot: '#9ca3af' },
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (currentUser?.role !== 'ADMIN') redirect('/dashboard')

  const { data: client } = await supabase
    .from('users')
    .select('id, email, full_name, created_at, sector, city, mrr, portal_enabled, contact_email, contact_phone, avatar_url')
    .eq('id', id)
    .eq('role', 'CLIENT')
    .single()

  if (!client) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, code, status, deadline, budget, progress, color, category')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const activeProjects = (projects ?? []).filter((p) => p.status !== 'archive')
  const totalBudget = (projects ?? []).reduce((acc, p) => acc + (p.budget ?? 0), 0)
  const color = '#1E5FFF'

  // Historique synthétique (events clés)
  const history = [
    { date: client.created_at, label: 'Premier contact · Création du compte', icon: '👤' },
    ...((projects ?? [])
      .filter((p) => p.status !== 'archive')
      .slice(0, 3)
      .map((p) => ({ date: p.deadline ?? '', label: `Projet : ${p.name}${p.code ? ` (${p.code})` : ''}`, icon: '📁' }))
      .filter((e) => e.date)
    ),
    client.portal_enabled ? { date: client.created_at, label: 'Portail client activé', icon: '🌐' } : null,
  ].filter(Boolean) as { date: string; label: string; icon: string }[]

  history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Nav */}
      <Link href="/dashboard/clients" className="flex items-center gap-1.5 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
        <ArrowLeft size={14} /> Base clients
      </Link>

      {/* Header */}
      <div
        className="rounded-[22px] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}18, ${color}05)`, border: `1px solid ${color}30` }}
      >
        <div className="h-1 w-full" style={{ background: color }} />
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-[22px] font-bold shrink-0"
              style={{ background: color }}
            >
              {getInitials(client.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="headline text-[32px] uppercase leading-tight">{client.full_name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-[var(--muted-foreground)]">
                {client.sector && <span className="flex items-center gap-1"><Building2 size={11} />{client.sector}</span>}
                {client.city && <span className="flex items-center gap-1"><MapPin size={11} />{client.city}</span>}
                <span className="flex items-center gap-1"><Calendar size={11} />Depuis {formatDate(client.created_at)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px]">
                <a href={`mailto:${client.contact_email ?? client.email}`} className="flex items-center gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  <Mail size={11} />{client.contact_email ?? client.email}
                </a>
                {client.contact_phone && (
                  <span className="flex items-center gap-1 text-[var(--muted-foreground)]"><Phone size={11} />{client.contact_phone}</span>
                )}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Projets actifs', value: activeProjects.length, icon: <FolderKanban size={14} />, c: color },
              { label: 'CA total', value: fmtEur(totalBudget), icon: <DollarSign size={14} />, c: '#10b981' },
              { label: 'MRR', value: client.mrr ? fmtEur(Number(client.mrr)) : '—', icon: <TrendingUp size={14} />, c: 'var(--orange)' },
              { label: 'Portail', value: client.portal_enabled ? 'Actif' : 'Inactif', icon: <Globe size={14} />, c: client.portal_enabled ? '#10b981' : '#9ca3af' },
            ].map(({ label, value, icon, c }) => (
              <div key={label} className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-3 space-y-1">
                <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]" style={{ color: c }}>{icon} {label}</p>
                <p className="headline text-[18px]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Projets */}
        <div className="xl:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h2 className="headline text-[16px] uppercase">Projets assignés</h2>
            <span className="text-[12px] text-[var(--muted-foreground)]">{projects?.length ?? 0} total</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {(!projects || projects.length === 0) && (
              <p className="text-[13px] text-[var(--muted-foreground)] p-5">Aucun projet associé.</p>
            )}
            {projects?.map((project) => {
              const style = STATUS_STYLES[project.status as ProjectStatus]
              const prog = project.progress ?? 0
              const accent = project.color ?? color
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: accent }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {project.code && <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{project.code}</span>}
                      <p className="text-[13px] font-semibold truncate group-hover:text-[var(--blue)] transition-colors">{project.name}</p>
                    </div>
                    {prog > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-1 rounded-full bg-[var(--muted)] flex-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${prog}%`, background: accent }} />
                        </div>
                        <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">{prog}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {project.deadline && <span className="text-[11px] text-[var(--muted-foreground)]">{formatDate(project.deadline)}</span>}
                    <span className={`pill text-[10px] border ${style.pill}`}>{PROJECT_STATUS_LABELS[project.status as ProjectStatus]}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          {/* Portail widget */}
          <ClientPortalWidget
            clientId={client.id}
            portalEnabled={client.portal_enabled ?? false}
          />

          {/* Historique */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="headline text-[16px] uppercase">Historique</h2>
            </div>
            <div className="p-4 space-y-3">
              {history.map((event, i) => (
                <div key={i} className="flex items-start gap-3 text-[12px]">
                  <span className="text-[16px] shrink-0">{event.icon}</span>
                  <div>
                    <p className="text-[var(--foreground)] leading-tight">{event.label}</p>
                    {event.date && <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{formatDate(event.date)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
