'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import {
  LayoutGrid, CheckSquare, Package, FileText, DollarSign,
  MessageSquare, Sparkles, ExternalLink, Loader2, Calendar, User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Task = {
  id: string
  title: string
  status: string
  priority: string
  due_date?: string | null
  assignee?: { id: string; full_name: string; avatar_url: string | null } | null
}

type Message = {
  id: string
  content: string
  thread_type: string
  created_at: string
  author?: { full_name: string } | null
}

type Delivery = {
  id: string
  title: string
  status: string
  drive_folder_url?: string | null
  created_at: string
}

interface Props {
  projectId: string
  projectName: string
  brief?: string | null
  accent: string
  tasks: Task[]
  messages: Message[]
  deliveries: Delivery[]
  client?: { id: string; full_name: string; email: string } | null
  lead?: { id: string; full_name: string } | null
  budget?: number | null
  tasksStats: { done: number; total: number }
}

const TASK_PRIORITY_STYLES: Record<string, string> = {
  urgente: 'bg-red-500/10 text-red-400 border-red-500/20',
  haute:   'bg-[var(--orange-soft)] text-[var(--orange)] border-[#FF4E1C30]',
  normale: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]',
  basse:   'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent',
}

const TASK_STATUS_STYLES: Record<string, string> = {
  a_faire:  'bg-[var(--chip)] text-[var(--muted-foreground)] border-transparent',
  en_cours: 'bg-[var(--blue-soft)] text-[var(--blue)] border-[#1E5FFF30]',
  bloque:   'bg-red-500/10 text-red-400 border-red-500/20',
  termine:  'bg-[#10b98120] text-[#059669] border-[#10b98130]',
}

const TASK_STATUS_LABELS: Record<string, string> = {
  a_faire: 'À faire', en_cours: 'En cours', bloque: 'Bloqué', termine: 'Terminé',
}

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  en_attente:        'bg-[#f5c51820] text-[#b8930a] border-[#f5c51840]',
  valide:            'bg-[#10b98120] text-[#059669] border-[#10b98130]',
  revision_demandee: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente', valide: 'Validé', revision_demandee: 'Révision',
}

const TABS = [
  { key: 'overview',  label: 'Vue d\'ensemble', icon: LayoutGrid },
  { key: 'tasks',     label: 'Tâches',          icon: CheckSquare },
  { key: 'files',     label: 'Livrables',        icon: Package },
  { key: 'brief',     label: 'Brief',            icon: FileText },
  { key: 'budget',    label: 'Budget',           icon: DollarSign },
]

export default function ProjectDetailTabs({
  projectId, projectName, brief, accent,
  tasks, messages, deliveries, client, lead, budget, tasksStats,
}: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const [generatingBrief, setGeneratingBrief] = useState(false)
  const [generatedBrief, setGeneratedBrief] = useState<string | null>(null)
  const supabase = createClient()

  async function generateBrief() {
    setGeneratingBrief(true)
    try {
      const res = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectName, brief }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedBrief(data.brief)
    } catch {
      toast.error('Impossible de générer le brief')
    } finally {
      setGeneratingBrief(false)
    }
  }

  async function saveBrief() {
    if (!generatedBrief) return
    await supabase.from('projects').update({ brief: generatedBrief }).eq('id', projectId)
    toast.success('Brief enregistré')
    setGeneratedBrief(null)
  }

  return (
    <div>
      {/* Tabs bar */}
      <div className="flex items-center gap-1 mb-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap ${
              activeTab === key
                ? 'text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
            style={activeTab === key ? { background: accent } : {}}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Tâches résumé */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="headline text-[14px] uppercase flex items-center gap-2">
                <CheckSquare size={14} style={{ color: accent }} />
                Tâches
              </h3>
              <Link href={`/dashboard/projects/${projectId}/tasks`} className="text-[11px] font-semibold hover:opacity-70" style={{ color: accent }}>
                Voir tout →
              </Link>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--muted-foreground)]">Terminées</span>
                <span className="font-bold">{tasksStats.done}/{tasksStats.total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: tasksStats.total > 0 ? `${Math.round(tasksStats.done / tasksStats.total * 100)}%` : '0%', background: accent }} />
              </div>
              {tasks.slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-[12px] py-1 border-b border-[var(--border)] last:border-0">
                  <span className={`truncate mr-2 ${t.status === 'termine' ? 'line-through opacity-50' : ''}`}>{t.title}</span>
                  <span className={`pill text-[10px] border shrink-0 ${TASK_STATUS_STYLES[t.status]}`}>{TASK_STATUS_LABELS[t.status]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Messages récents */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="headline text-[14px] uppercase flex items-center gap-2">
                <MessageSquare size={14} style={{ color: accent }} />
                Messages
              </h3>
              <Link href={`/dashboard/projects/${projectId}/messages`} className="text-[11px] font-semibold hover:opacity-70" style={{ color: accent }}>
                Ouvrir →
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {messages.length === 0 && <p className="text-[12px] text-[var(--muted-foreground)] p-4">Aucun message.</p>}
              {messages.slice(0, 4).map((msg) => (
                <div key={msg.id} className="px-4 py-2.5">
                  <p className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-0.5">
                    {(msg.author as { full_name: string } | null)?.full_name ?? '—'}
                    <span className="ml-2 font-normal opacity-60">{new Date(msg.created_at).toLocaleDateString('fr-FR')}</span>
                  </p>
                  <p className="text-[12px] text-[var(--foreground)] line-clamp-2">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Livrables */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="headline text-[14px] uppercase flex items-center gap-2">
                <Package size={14} style={{ color: accent }} />
                Livrables
              </h3>
              <Link href={`/dashboard/projects/${projectId}/delivery`} className="text-[11px] font-semibold hover:opacity-70" style={{ color: accent }}>
                Gérer →
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {deliveries.length === 0 && <p className="text-[12px] text-[var(--muted-foreground)] p-4">Aucun livrable.</p>}
              {deliveries.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[12px] truncate mr-2">{d.title}</span>
                  <span className={`pill text-[10px] border shrink-0 ${DELIVERY_STATUS_STYLES[d.status]}`}>{DELIVERY_STATUS_LABELS[d.status]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tâches */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--muted-foreground)]">{tasksStats.done}/{tasksStats.total} tâches terminées</p>
            <Link
              href={`/dashboard/projects/${projectId}/tasks`}
              className="px-4 py-2 rounded-full text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              Voir le Kanban →
            </Link>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden divide-y divide-[var(--border)]">
            {tasks.length === 0 && <p className="text-[13px] text-[var(--muted-foreground)] p-5">Aucune tâche pour ce projet.</p>}
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'termine' ? 'bg-[#10b981]' : 'bg-[var(--muted-foreground)]'}`} />
                  <span className={`text-[13px] font-medium truncate ${task.status === 'termine' ? 'line-through opacity-50' : ''}`}>{task.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.due_date && <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1"><Calendar size={10} />{formatDate(task.due_date)}</span>}
                  <span className={`pill text-[10px] border ${TASK_PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                  <span className={`pill text-[10px] border ${TASK_STATUS_STYLES[task.status]}`}>{TASK_STATUS_LABELS[task.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Livrables */}
      {activeTab === 'files' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link
              href={`/dashboard/projects/${projectId}/delivery`}
              className="px-4 py-2 rounded-full text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              Gérer les livrables →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {deliveries.length === 0 && (
              <p className="text-[13px] text-[var(--muted-foreground)] col-span-3">Aucun livrable pour ce projet.</p>
            )}
            {deliveries.map((d) => (
              <div key={d.id} className="bg-[var(--card)] border border-[var(--border)] rounded-[16px] p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold leading-tight">{d.title}</p>
                  <span className={`pill text-[10px] border shrink-0 ${DELIVERY_STATUS_STYLES[d.status]}`}>{DELIVERY_STATUS_LABELS[d.status]}</span>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)]">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                {d.drive_folder_url && (
                  <a href={d.drive_folder_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity" style={{ color: accent }}>
                    <ExternalLink size={10} /> Voir sur Drive
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brief */}
      {activeTab === 'brief' && (
        <div className="space-y-4">
          {/* Brief existant */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-5">
            <h3 className="headline text-[14px] uppercase mb-3 flex items-center gap-2">
              <FileText size={14} style={{ color: accent }} />
              Brief du projet
            </h3>
            {brief ? (
              <p className="text-[14px] text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{brief}</p>
            ) : (
              <p className="text-[13px] text-[var(--muted-foreground)] italic">Aucun brief renseigné.</p>
            )}
          </div>

          {/* Widget IA */}
          <div
            className="rounded-[18px] p-5 space-y-3"
            style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}05)`, border: `1px solid ${accent}30` }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={16} style={{ color: accent }} />
              <h3 className="headline text-[14px] uppercase">Générer le brief client</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: accent }}>IA</span>
            </div>
            <p className="text-[12px] text-[var(--muted-foreground)]">
              L&apos;IA analyse le contexte du projet et génère un brief structuré prêt à partager avec le client.
            </p>
            <button
              onClick={generateBrief}
              disabled={generatingBrief}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: accent }}
            >
              {generatingBrief ? <><Loader2 size={13} className="animate-spin" /> Génération...</> : <><Sparkles size={13} /> Générer le brief</>}
            </button>

            {generatedBrief && (
              <div className="space-y-3">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[13px] text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{generatedBrief}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveBrief} className="px-4 py-2 rounded-full text-[12px] font-semibold text-white" style={{ background: accent }}>
                    Enregistrer
                  </button>
                  <button onClick={() => setGeneratedBrief(null)} className="px-4 py-2 rounded-full text-[12px] font-medium border border-[var(--border)] text-[var(--muted-foreground)]">
                    Ignorer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Budget */}
      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-5 col-span-1"
          >
            <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Budget alloué</p>
            <p className="headline text-[32px]" style={{ color: accent }}>
              {budget ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(budget) : '—'}
            </p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-5">
            <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Client</p>
            {client ? (
              <div>
                <p className="text-[14px] font-semibold flex items-center gap-1.5"><User size={13} style={{ color: accent }} />{client.full_name}</p>
                <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">{client.email}</p>
              </div>
            ) : <p className="text-[13px] text-[var(--muted-foreground)]">Non assigné</p>}
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-5">
            <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Responsable</p>
            {lead ? (
              <p className="text-[14px] font-semibold flex items-center gap-1.5"><User size={13} style={{ color: accent }} />{lead.full_name}</p>
            ) : <p className="text-[13px] text-[var(--muted-foreground)]">Non assigné</p>}
          </div>
        </div>
      )}
    </div>
  )
}
