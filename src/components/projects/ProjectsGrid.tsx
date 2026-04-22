'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Calendar, User, TrendingUp, Tag } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { type ProjectStatus, type ProjectCategory } from '@/types'
import { useRouter, usePathname } from 'next/navigation'

const STATUS_STYLES: Record<ProjectStatus, { pill: string; dot: string; accent: string }> = {
  en_brief:      { pill: 'bg-[#f5c51820] text-[#b8930a] border-[#f5c51840]',              dot: '#f5c518',       accent: '#f5c518' },
  en_production: { pill: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]',    dot: 'var(--blue)',   accent: 'var(--blue)' },
  en_livraison:  { pill: 'bg-[var(--orange-soft)] text-[var(--orange)] border-[#FF4E1C30]', dot: 'var(--orange)', accent: 'var(--orange)' },
  livre:         { pill: 'bg-[#10b98120] text-[#059669] border-[#10b98130]',               dot: '#10b981',       accent: '#10b981' },
  archive:       { pill: 'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent', dot: '#9ca3af',   accent: '#9ca3af' },
}

const CATEGORY_STYLES: Record<string, { pill: string; dot: string }> = {
  creation:      { pill: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]', dot: 'var(--blue)' },
  publicite:     { pill: 'bg-[var(--orange-soft)] text-[var(--orange)] border-[#FF4E1C30]', dot: 'var(--orange)' },
  communication: { pill: 'bg-[#10b98120] text-[#059669] border-[#10b98130]', dot: '#10b981' },
  acquisition:   { pill: 'bg-[#8b5cf620] text-[#7c3aed] border-[#8b5cf630]', dot: '#8b5cf6' },
}

type ProjectRow = {
  id: string
  name: string
  status: string
  deadline?: string | null
  brief?: string | null
  color?: string | null
  code?: string | null
  category?: string | null
  budget?: number | null
  progress?: number | null
  tags?: string[] | null
  client?: { id: string; full_name: string } | null
  members?: { user: { id: string; full_name: string; avatar_url: string | null } }[]
}

interface Props {
  projects: ProjectRow[]
  catCounts: Record<string, number>
  statusCounts: Record<string, number>
  activeCategory?: string
  activeStatus?: string
  searchQuery?: string
  statusLabels: Record<string, string>
  categoryLabels: Record<string, string>
}

const ALL_STATUSES: ProjectStatus[] = ['en_brief', 'en_production', 'en_livraison', 'livre', 'archive']
const ALL_CATEGORIES: ProjectCategory[] = ['creation', 'publicite', 'communication', 'acquisition']

export default function ProjectsGrid({
  projects,
  catCounts,
  statusCounts,
  activeCategory,
  activeStatus,
  searchQuery: initialSearch,
  statusLabels,
  categoryLabels,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(initialSearch ?? '')

  function applyFilter(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const merged = {
      category: activeCategory,
      status: activeStatus,
      q: search || undefined,
      ...params,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) sp.set(k, v)
    }
    router.push(`${pathname}?${sp.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilter({ q: search || undefined })
  }

  const grouped = useMemo(() => {
    const g: Record<string, ProjectRow[]> = {}
    for (const p of projects) {
      if (!g[p.status]) g[p.status] = []
      g[p.status].push(p)
    }
    return g
  }, [projects])

  return (
    <div className="space-y-5">
      {/* Filtres & recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Recherche */}
        <form onSubmit={handleSearch} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un projet..."
            className="pl-8 pr-4 py-2 text-[13px] rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--blue)] transition-colors w-56"
          />
        </form>

        {/* Filtres catégorie */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => applyFilter({ category: undefined })}
            className={`pill text-[12px] border transition-colors ${
              !activeCategory
                ? 'bg-[var(--ink)] text-white border-transparent'
                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--blue)]'
            }`}
          >
            Tous
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const style = CATEGORY_STYLES[cat]
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => applyFilter({ category: active ? undefined : cat })}
                className={`pill text-[12px] border transition-colors ${
                  active ? style.pill : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--blue)]'
                }`}
              >
                {categoryLabels[cat]}
                {catCounts[cat] ? (
                  <span className="ml-1 opacity-60">({catCounts[cat]})</span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Filtre statut */}
        <div className="flex gap-2 flex-wrap">
          {ALL_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => {
            const style = STATUS_STYLES[s]
            const active = activeStatus === s
            return (
              <button
                key={s}
                onClick={() => applyFilter({ status: active ? undefined : s })}
                className={`pill text-[11px] border transition-colors ${
                  active ? style.pill : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--blue)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: style.dot }} />
                {statusLabels[s]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grille par statut */}
      {ALL_STATUSES.map((status) => {
        const list = grouped[status]
        if (!list || list.length === 0) return null
        const style = STATUS_STYLES[status]
        return (
          <div key={status}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: style.dot }} />
              <span className="headline text-[15px] uppercase tracking-wide">{statusLabels[status]}</span>
              <span className={`pill text-[11px] border ${style.pill}`}>{list.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.map((project) => {
                const accent = project.color ?? style.accent
                const catStyle = project.category ? CATEGORY_STYLES[project.category] : null
                const clientName = project.client?.full_name
                const progress = project.progress ?? 0

                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="group bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden transition-transform hover:-translate-y-0.5"
                    style={{ boxShadow: '0 2px 8px rgba(10,10,10,0.04)' }}
                  >
                    {/* Bande couleur + code */}
                    <div
                      className="h-1.5 w-full relative"
                      style={{ background: accent }}
                    />

                    <div className="p-4 space-y-3">
                      {/* Titre + statut */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {project.code && (
                            <p className="text-[10px] font-bold tracking-widest text-[var(--muted-foreground)] uppercase mb-0.5">
                              {project.code}
                            </p>
                          )}
                          <h3 className="headline text-[16px] uppercase leading-tight line-clamp-2 group-hover:text-[var(--blue)] transition-colors">
                            {project.name}
                          </h3>
                        </div>
                        <span className={`pill text-[11px] border shrink-0 ${style.pill}`}>
                          {statusLabels[status]}
                        </span>
                      </div>

                      {/* Brief */}
                      {project.brief && (
                        <p className="text-[12px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                          {project.brief}
                        </p>
                      )}

                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--chip)] text-[var(--muted-foreground)] border border-[var(--border)]"
                            >
                              <Tag size={8} />
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="text-[10px] text-[var(--muted-foreground)]">+{project.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Progression */}
                      {progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                            <span className="flex items-center gap-1"><TrendingUp size={10} /> Progression</span>
                            <span className="font-semibold" style={{ color: accent }}>{progress}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-[var(--muted)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${progress}%`, background: accent }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[12px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          {catStyle && (
                            <span className={`pill text-[10px] border ${catStyle.pill}`}>
                              {categoryLabels[project.category!]}
                            </span>
                          )}
                          {clientName ? (
                            <div className="flex items-center gap-1">
                              <User size={10} />
                              <span className="truncate max-w-[90px]">{clientName}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {project.budget && (
                            <span className="font-semibold text-[var(--foreground)]">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(project.budget)}
                            </span>
                          )}
                          {project.deadline && (
                            <div className="flex items-center gap-1">
                              <Calendar size={10} />
                              <span>{formatDate(project.deadline)}</span>
                            </div>
                          )}
                        </div>
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
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--muted-foreground)]">
          <div className="ghost-word text-[80px] leading-none mb-4">VIDE</div>
          <p className="text-[14px] mb-6">Aucun projet trouvé.</p>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--ink)] text-white text-[13px] font-semibold transition-transform hover:-translate-y-px"
          >
            Créer un projet
          </Link>
        </div>
      )}
    </div>
  )
}
