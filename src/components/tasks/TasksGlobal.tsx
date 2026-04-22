'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, RotateCcw, SortAsc, SortDesc } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import PriorityBadge from './PriorityBadge'
import TaskCreateDrawer from './TaskCreateDrawer'
import type { TaskStatus, TaskPriority } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskRow {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  project_id: string | null
  assignee_id: string | null
  tags: string[] | null
  project: { id: string; name: string; code: string | null; color: string | null } | null
  assignee: { id: string; full_name: string } | null
}

interface Project { id: string; name: string; code: string | null }
interface TeamMember { id: string; full_name: string }

interface Props {
  initialTasks: TaskRow[]
  projects: Project[]
  teamMembers: TeamMember[]
}

type SortKey = 'due_date' | 'priority' | null

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: 'À faire', en_cours: 'En cours', bloque: 'Bloqué', termine: 'Terminé',
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  a_faire:  'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent',
  en_cours: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]',
  bloque:   'bg-[#ef444420] text-[#dc2626] border-[#ef444430]',
  termine:  'bg-[#10b98120] text-[#059669] border-[#10b98130]',
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgente: 0, haute: 1, normale: 2, basse: 3,
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  basse: 'Basse', normale: 'Normale', haute: 'Haute', urgente: 'Urgente',
}

const COLS = '32px 1fr 150px 120px 96px 150px'

function isOverdue(date: string | null): boolean {
  if (!date) return false
  const d = new Date(date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function TasksGlobal({ initialTasks, projects, teamMembers }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [filterProject, setFilterProject] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: null, dir: 'asc' })
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => { setTasks(initialTasks) }, [initialTasks])

  const activeFilterCount = [filterStatus, filterPriority, filterProject, filterAssignee]
    .filter((v) => v !== 'all').length

  const filtered = useMemo(() => {
    let result = tasks

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
        t.project?.name.toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all')   result = result.filter((t) => t.status === filterStatus)
    if (filterPriority !== 'all') result = result.filter((t) => t.priority === filterPriority)
    if (filterProject === 'none') result = result.filter((t) => t.project_id === null)
    else if (filterProject !== 'all') result = result.filter((t) => t.project_id === filterProject)
    if (filterAssignee !== 'all') result = result.filter((t) => t.assignee_id === filterAssignee)

    if (sort.key === 'due_date') {
      result = [...result].sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
        return sort.dir === 'asc' ? da - db : db - da
      })
    } else if (sort.key === 'priority') {
      result = [...result].sort((a, b) => {
        const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        return sort.dir === 'asc' ? diff : -diff
      })
    }

    return result
  }, [tasks, search, filterStatus, filterPriority, filterProject, filterAssignee, sort])

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key && prev.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' }
    )
  }

  function resetFilters() {
    setSearch(''); setFilterStatus('all'); setFilterPriority('all')
    setFilterProject('all'); setFilterAssignee('all')
  }

  const selectCls = "text-[12px] px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] transition-colors cursor-pointer"

  return (
    <>
      {/* Barre de filtres */}
      <div className="flex flex-wrap gap-2.5 items-center sticky top-0 bg-[var(--background)] py-3 z-10 border-b border-[var(--border)] -mx-6 px-6">
        {/* Recherche */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher une tâche…"
            className="pl-8 pr-4 py-1.5 text-[13px] rounded-full bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] transition-colors w-48"
          />
        </div>

        {/* Statut pills */}
        <div className="flex gap-1.5">
          {(['all', 'a_faire', 'en_cours', 'bloque', 'termine'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`pill text-[11px] border transition-colors ${filterStatus === s ? 'bg-[var(--ink)] text-white border-transparent' : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--blue)]'}`}
            >
              {s === 'all' ? 'Tous' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Priorité */}
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')} className={selectCls}>
          <option value="all">Toutes priorités</option>
          {(['urgente', 'haute', 'normale', 'basse'] as TaskPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>

        {/* Projet */}
        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={`${selectCls} max-w-[180px]`}>
          <option value="all">Tous les projets</option>
          <option value="none">Sans projet</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code ? `${p.code} · ` : ''}{p.name}</option>
          ))}
        </select>

        {/* Assigné */}
        <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className={selectCls}>
          <option value="all">Tous les membres</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>

        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <RotateCcw size={11} /> Réinitialiser ({activeFilterCount})
          </button>
        )}

        <button
          onClick={() => setDrawerOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-5 py-2 rounded-full bg-[var(--ink)] text-white text-[13px] font-semibold shrink-0 transition-transform hover:-translate-y-px"
        >
          <Plus size={14} /> Nouvelle tâche
        </button>
      </div>

      {/* Compteur */}
      <p className="text-[12px] text-[var(--muted-foreground)] pt-1 pb-0.5">
        {filtered.length} tâche{filtered.length > 1 ? 's' : ''}
        {filtered.length !== tasks.length && <span className="opacity-60"> · {tasks.length} au total</span>}
      </p>

      {/* État vide */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[14px] font-semibold mb-1">Aucune tâche trouvée</p>
          <p className="text-[13px] text-[var(--muted-foreground)] mb-4">
            Modifiez vos filtres ou créez une nouvelle tâche.
          </p>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-[13px] hover:bg-[var(--muted)] transition-colors">
              <RotateCcw size={13} /> Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
          {/* En-têtes */}
          <div
            className="grid items-center px-4 py-3 border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]"
            style={{ gridTemplateColumns: COLS }}
          >
            <span />
            <span>Tâche</span>
            <span>Projet</span>
            <button className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors" onClick={() => toggleSort('priority')}>
              Priorité
              {sort.key === 'priority' && (sort.dir === 'asc' ? <SortAsc size={10} /> : <SortDesc size={10} />)}
            </button>
            <button className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors" onClick={() => toggleSort('due_date')}>
              Échéance
              {sort.key === 'due_date' && (sort.dir === 'asc' ? <SortAsc size={10} /> : <SortDesc size={10} />)}
            </button>
            <span>Assigné</span>
          </div>

          {/* Lignes */}
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((task) => {
              const accent = task.project?.color ?? 'var(--blue)'
              const overdue = isOverdue(task.due_date)
              return (
                <div
                  key={task.id}
                  className="grid items-center px-4 py-3.5 hover:bg-[var(--muted)] transition-colors"
                  style={{ gridTemplateColumns: COLS }}
                >
                  {/* Dot priorité */}
                  <PriorityBadge priority={task.priority} />

                  {/* Titre + statut + tags */}
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[13px] font-semibold truncate max-w-[280px]">{task.title}</p>
                      <span className={`pill text-[10px] border shrink-0 ${STATUS_STYLES[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </div>
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {task.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--chip)] border border-[var(--border)] text-[var(--muted-foreground)]">
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="text-[10px] text-[var(--muted-foreground)]">+{task.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Projet */}
                  <div className="shrink-0">
                    {task.project ? (
                      <Link
                        href={`/dashboard/projects/${task.project.id}`}
                        className="flex items-center gap-1.5 group/p"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                        <span className="text-[11px] font-mono text-[var(--muted-foreground)] truncate max-w-[115px] group-hover/p:text-[var(--blue)] transition-colors">
                          {task.project.code ?? task.project.name}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--chip)] border border-[var(--border)] text-[var(--muted-foreground)]">
                        Interne
                      </span>
                    )}
                  </div>

                  {/* Priorité label */}
                  <PriorityBadge priority={task.priority} showLabel />

                  {/* Échéance */}
                  <div className="shrink-0">
                    {task.due_date ? (
                      <span className={`text-[11px] font-medium ${overdue ? 'text-[#ef4444]' : 'text-[var(--muted-foreground)]'}`}>
                        {formatDate(task.due_date)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
                    )}
                  </div>

                  {/* Assigné */}
                  <div className="shrink-0 flex items-center gap-2">
                    {task.assignee ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-[var(--blue)] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {getInitials(task.assignee.full_name)}
                        </div>
                        <span className="text-[11px] text-[var(--muted-foreground)] truncate max-w-[95px]">
                          {task.assignee.full_name}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <TaskCreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => router.refresh()}
        projects={projects}
        teamMembers={teamMembers}
      />
    </>
  )
}
