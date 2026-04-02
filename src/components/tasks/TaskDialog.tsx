'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { type Task, type TaskStatus, type TaskPriority } from '@/types'
import { Plus, Trash2, Loader2 } from 'lucide-react'

interface TeamMember {
  id: string
  full_name: string
  avatar_url: string | null
}

interface TaskDialogProps {
  open: boolean
  onClose: () => void
  onSave: (task: Partial<Task>) => Promise<void>
  task: Task | null
  defaultStatus: TaskStatus
  teamMembers: TeamMember[]
  projectId: string
}

export default function TaskDialog({
  open,
  onClose,
  onSave,
  task,
  defaultStatus,
  teamMembers,
}: TaskDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: defaultStatus as string,
    priority: 'normale' as string,
    assignee_id: '',
    due_date: '',
  })
  const [checklist, setChecklist] = useState<
    { id?: string; label: string; completed: boolean }[]
  >([])
  const [newCheckItem, setNewCheckItem] = useState('')

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        assignee_id: task.assignee_id ?? '',
        due_date: task.due_date ?? '',
      })
      setChecklist(task.checklist ?? [])
    } else {
      setForm({
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'normale',
        assignee_id: '',
        due_date: '',
      })
      setChecklist([])
    }
  }, [task, defaultStatus, open])

  function addCheckItem() {
    if (!newCheckItem.trim()) return
    setChecklist((prev) => [
      ...prev,
      { label: newCheckItem.trim(), completed: false },
    ])
    setNewCheckItem('')
  }

  async function handleSubmit() {
    if (!form.title.trim()) return
    setLoading(true)

    await onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status as TaskStatus,
      priority: form.priority as TaskPriority,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date || null,
    })

    // Gérer la checklist séparément si édition d'une tâche existante
    if (task) {
      // Supprimer les items existants et recréer
      await supabase.from('task_checklist_items').delete().eq('task_id', task.id)
      if (checklist.length > 0) {
        await supabase.from('task_checklist_items').insert(
          checklist.map((item, i) => ({
            task_id: task.id,
            label: item.label,
            completed: item.completed,
            position: i,
          }))
        )
      }
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--foreground)]">
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Titre */}
          <div className="space-y-1.5">
            <Label className="text-sm text-[var(--foreground)]">Titre *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Nom de la tâche"
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm text-[var(--foreground)]">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Détails, contexte..."
              rows={3}
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] resize-none"
            />
          </div>

          {/* Statut + Priorité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-[var(--foreground)]">Statut</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                  <SelectItem value="a_faire">À faire</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="bloque">Bloqué</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-[var(--foreground)]">Priorité</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                  <SelectItem value="basse">Basse</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigné + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-[var(--foreground)]">Assigné à</Label>
              <Select
                value={form.assignee_id}
                onValueChange={(v) => setForm({ ...form, assignee_id: v })}
              >
                <SelectTrigger className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-[var(--foreground)]">Deadline</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label className="text-sm text-[var(--foreground)]">Checklist</Label>
            <div className="space-y-1.5">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={(checked) => {
                      setChecklist((prev) =>
                        prev.map((it, idx) =>
                          idx === i ? { ...it, completed: !!checked } : it
                        )
                      )
                    }}
                    className="border-[var(--border)]"
                  />
                  <span className={`text-sm flex-1 ${item.completed ? 'line-through text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setChecklist((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCheckItem())}
                placeholder="Ajouter un élément..."
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCheckItem}
                className="border-[var(--border)] text-[var(--muted-foreground)] shrink-0"
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[var(--border)] text-[var(--muted-foreground)]"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.title.trim()}
            className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin mr-2" />
            ) : null}
            {task ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
