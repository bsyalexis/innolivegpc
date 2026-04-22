'use client'

import { useReducer, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Loader2, Plus } from 'lucide-react'
import type { TaskStatus, TaskPriority } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; code?: string | null }
interface TeamMember { id: string; full_name: string }

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  projects: Project[]
  teamMembers: TeamMember[]
}

type FormState = {
  title: string
  description: string
  linked: boolean
  project_id: string
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string
  due_date: string
  tags: string[]
  tagInput: string
}

type FormAction =
  | { type: 'SET'; key: keyof FormState; value: FormState[keyof FormState] }
  | { type: 'TOGGLE_LINK'; linked: boolean }
  | { type: 'ADD_TAG' }
  | { type: 'REMOVE_TAG'; index: number }
  | { type: 'RESET' }

const INITIAL: FormState = {
  title: '', description: '', linked: false, project_id: '',
  status: 'a_faire', priority: 'normale', assignee_id: '',
  due_date: '', tags: [], tagInput: '',
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.key]: action.value }
    case 'TOGGLE_LINK':
      return { ...state, linked: action.linked, project_id: '' }
    case 'ADD_TAG':
      if (!state.tagInput.trim() || state.tags.length >= 5) return state
      return { ...state, tags: [...state.tags, state.tagInput.trim()], tagInput: '' }
    case 'REMOVE_TAG':
      return { ...state, tags: state.tags.filter((_, i) => i !== action.index) }
    case 'RESET':
      return INITIAL
  }
}

// ─── Constantes UI ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'bloque', label: 'Bloqué' },
  { value: 'termine', label: 'Terminé' },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'basse',   label: 'Basse',   color: 'var(--muted-foreground)' },
  { value: 'normale', label: 'Normale', color: 'var(--blue)' },
  { value: 'haute',   label: 'Haute',   color: 'var(--orange)' },
  { value: 'urgente', label: 'Urgente', color: '#ef4444' },
]

const INPUT = "w-full px-3.5 py-2.5 text-[13px] rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[#1E5FFF20] transition-all placeholder:text-[var(--muted-foreground)]"
const SELECT = `${INPUT} appearance-none cursor-pointer`

// ─── Sous-composant Field ──────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-[var(--foreground)]">
        {label}{required && <span className="text-[var(--orange)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="w-1 h-3.5 rounded-full" style={{ background: color }} />
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</p>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TaskCreateDrawer({ open, onClose, onCreated, projects, teamMembers }: Props) {
  const supabase = createClient()
  const [form, dispatch] = useReducer(formReducer, INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) { dispatch({ type: 'RESET' }); setError(null) }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function validate(): string | null {
    if (!form.title.trim()) return 'Le titre est requis'
    if (form.title.trim().length > 120) return 'Le titre ne peut pas dépasser 120 caractères'
    if (!form.assignee_id) return 'Un assigné est requis'
    if (form.linked && !form.project_id) return 'Sélectionnez un projet ou désactivez le lien'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError(null)

    const { error: dbError } = await supabase.from('tasks').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      project_id: form.linked && form.project_id ? form.project_id : null,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date || null,
      tags: form.tags,
    })

    if (dbError) {
      toast.error('Erreur lors de la création')
      setLoading(false)
      return
    }

    toast.success(`Tâche "${form.title}" créée`)
    onCreated()
    onClose()
    setLoading(false)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-[var(--background)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl">

        {/* En-tête */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)] shrink-0 flex items-start justify-between">
          <div>
            <h2 className="headline text-[22px] uppercase">Nouvelle tâche</h2>
            <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">Liée à un projet ou interne</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <Section label="Contenu" color="var(--blue)" />

          <Field label="Titre" required>
            <input
              value={form.title}
              onChange={(e) => dispatch({ type: 'SET', key: 'title', value: e.target.value })}
              placeholder="Nom de la tâche..."
              maxLength={120}
              className={INPUT}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => dispatch({ type: 'SET', key: 'description', value: e.target.value })}
              placeholder="Détails optionnels..."
              maxLength={500}
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </Field>

          <Section label="Rattachement" color="var(--orange)" />

          {/* Toggle projet */}
          <Field label="Lié à un projet">
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_LINK', linked: !form.linked })}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-all w-full"
              style={{
                background: form.linked ? '#1E5FFF12' : 'var(--card)',
                borderColor: form.linked ? '#1E5FFF60' : 'var(--border)',
                color: form.linked ? 'var(--blue)' : 'var(--muted-foreground)',
              }}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${form.linked ? 'border-[var(--blue)] bg-[var(--blue)]' : 'border-[var(--border)]'}`}>
                {form.linked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              {form.linked ? 'Tâche liée à un projet' : 'Tâche interne (aucun projet)'}
            </button>
          </Field>

          {form.linked && (
            <Field label="Projet" required>
              <select
                value={form.project_id}
                onChange={(e) => dispatch({ type: 'SET', key: 'project_id', value: e.target.value })}
                className={SELECT}
              >
                <option value="">— Sélectionner un projet</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `${p.code} · ` : ''}{p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Section label="Paramètres" color="#10b981" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Statut" required>
              <select
                value={form.status}
                onChange={(e) => dispatch({ type: 'SET', key: 'status', value: e.target.value as TaskStatus })}
                className={SELECT}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Assigné" required>
              <select
                value={form.assignee_id}
                onChange={(e) => dispatch({ type: 'SET', key: 'assignee_id', value: e.target.value })}
                className={SELECT}
              >
                <option value="">— Choisir</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Priorité">
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => dispatch({ type: 'SET', key: 'priority', value: o.value })}
                  className="py-2 rounded-xl border text-[11px] font-semibold transition-all flex items-center gap-1.5 justify-center"
                  style={{
                    background: form.priority === o.value ? `color-mix(in srgb, ${o.color} 12%, transparent)` : 'var(--card)',
                    borderColor: form.priority === o.value ? o.color : 'var(--border)',
                    color: form.priority === o.value ? o.color : 'var(--muted-foreground)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.color }} />
                  {o.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Échéance">
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => dispatch({ type: 'SET', key: 'due_date', value: e.target.value })}
              className={INPUT}
            />
          </Field>

          <Field label={`Tags${form.tags.length > 0 ? ` (${form.tags.length}/5)` : ''}`}>
            <input
              value={form.tagInput}
              onChange={(e) => dispatch({ type: 'SET', key: 'tagInput', value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dispatch({ type: 'ADD_TAG' }) } }}
              placeholder="Ajouter un tag + Entrée"
              disabled={form.tags.length >= 5}
              className={INPUT}
            />
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-[var(--chip)] border border-[var(--border)]">
                    {tag}
                    <button onClick={() => dispatch({ type: 'REMOVE_TAG', index: i })} className="hover:text-[#ef4444] transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          {error && (
            <p className="text-[12px] text-[#ef4444] bg-[#ef444410] border border-[#ef444430] rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}
        </div>

        {/* Pied */}
        <div className="px-6 py-4 border-t border-[var(--border)] shrink-0">
          <button
            onClick={handleSubmit}
            disabled={loading || !form.title.trim() || !form.assignee_id}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--ink)', color: 'white' }}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" />Création...</>
              : <><Plus size={14} />Créer la tâche</>
            }
          </button>
        </div>
      </div>
    </>
  )
}
