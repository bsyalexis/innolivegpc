'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, FolderKanban, CheckSquare, ArrowRight, X } from 'lucide-react'

interface Result {
  type: 'project' | 'task'
  id: string
  title: string
  subtitle?: string
  href: string
  color?: string | null
  code?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
}

function ResultRow({ result, isSelected, onClick }: { result: Result; isSelected: boolean; onClick: () => void }) {
  const accent = result.color ?? 'var(--blue)'
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isSelected ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'}`}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: result.type === 'project' ? `${accent}20` : 'var(--chip)' }}
      >
        {result.type === 'project'
          ? <FolderKanban size={14} style={{ color: accent }} />
          : <CheckSquare size={14} className="text-[var(--muted-foreground)]" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-[11px] text-[var(--muted-foreground)] truncate">{result.subtitle}</p>
        )}
      </div>
      {result.code && (
        <span className="text-[10px] font-mono text-[var(--muted-foreground)] bg-[var(--chip)] px-2 py-0.5 rounded shrink-0">
          {result.code}
        </span>
      )}
      <ArrowRight size={13} className="text-[var(--muted-foreground)] shrink-0" />
    </button>
  )
}

export default function SearchPalette({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (open) {
      setQuery(''); setResults([]); setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) { router.push(results[selected].href); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, selected, onClose, router])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = `%${query.trim()}%`
    const timer = setTimeout(async () => {
      setLoading(true)
      const [{ data: projects }, { data: tasks }] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, code, color')
          .or(`name.ilike.${q},code.ilike.${q}`)
          .limit(5),
        supabase
          .from('tasks')
          .select('id, title, project:projects(name)')
          .ilike('title', q)
          .limit(5),
      ])

      const projectResults: Result[] = (projects ?? []).map((p) => ({
        type: 'project', id: p.id, title: p.name,
        subtitle: p.code ?? undefined,
        href: `/dashboard/projects/${p.id}`,
        color: p.color, code: p.code,
      }))

      const taskResults: Result[] = (tasks ?? []).map((t) => ({
        type: 'task', id: t.id, title: t.title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subtitle: (t.project as any)?.name ?? 'Tâche interne',
        href: `/dashboard/tasks`,
      }))

      setResults([...projectResults, ...taskResults])
      setSelected(0)
      setLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const projectHits = results.filter((r) => r.type === 'project')
  const taskHits = results.filter((r) => r.type === 'task')

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      <div className="fixed left-1/2 top-[18vh] -translate-x-1/2 z-50 w-full max-w-[580px] px-4">
        <div
          className="bg-[var(--card)] border border-[var(--border)] rounded-[22px] overflow-hidden"
          style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.14)' }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
            <Search size={17} className="text-[var(--muted-foreground)] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un projet, une tâche…"
              className="flex-1 bg-transparent text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                <X size={14} />
              </button>
            )}
            <kbd className="text-[10px] bg-[var(--muted)] text-[var(--muted-foreground)] px-2 py-1 rounded-lg font-semibold shrink-0">ESC</kbd>
          </div>

          {/* Contenu */}
          {!query.trim() && (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] text-[var(--muted-foreground)]">Tapez pour chercher des projets ou des tâches</p>
            </div>
          )}

          {query.trim() && loading && (
            <div className="px-5 py-7 text-center">
              <p className="text-[13px] text-[var(--muted-foreground)]">Recherche…</p>
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-[14px] font-semibold mb-1">Aucun résultat</p>
              <p className="text-[12px] text-[var(--muted-foreground)]">Essayez avec d&apos;autres mots-clés</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2 max-h-[360px] overflow-y-auto">
              {projectHits.length > 0 && (
                <>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Projets</p>
                  {projectHits.map((r, i) => (
                    <ResultRow key={r.id} result={r} isSelected={selected === i} onClick={() => { router.push(r.href); onClose() }} />
                  ))}
                </>
              )}
              {taskHits.length > 0 && (
                <>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Tâches</p>
                  {taskHits.map((r, i) => {
                    const idx = projectHits.length + i
                    return (
                      <ResultRow key={r.id} result={r} isSelected={selected === idx} onClick={() => { router.push(r.href); onClose() }} />
                    )
                  })}
                </>
              )}
            </div>
          )}

          {results.length > 0 && (
            <div className="flex items-center gap-4 px-5 py-2.5 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5"><kbd className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-[10px] font-bold">↑↓</kbd> Naviguer</span>
              <span className="flex items-center gap-1.5"><kbd className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-[10px] font-bold">↵</kbd> Ouvrir</span>
              <span className="flex items-center gap-1.5"><kbd className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-[10px] font-bold">ESC</kbd> Fermer</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
