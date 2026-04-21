'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { type User, type Project } from '@/types'

interface Props {
  project: Project
  clients: User[]
  teamMembers: User[]
  currentMemberIds: string[]
  canDelete: boolean
}

export default function ProjectEditForm({
  project,
  clients,
  teamMembers,
  currentMemberIds,
  canDelete,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>(currentMemberIds)

  const [form, setForm] = useState({
    name: project.name,
    brief: project.brief ?? '',
    status: project.status,
    deadline: project.deadline ?? '',
    client_id: project.client_id ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    setLoading(true)

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        name: form.name.trim(),
        brief: form.brief.trim() || null,
        status: form.status,
        deadline: form.deadline || null,
        client_id: form.client_id || null,
      })
      .eq('id', project.id)

    if (updateError) {
      toast.error('Erreur lors de la mise à jour du projet')
      setLoading(false)
      return
    }

    // Sync membres : suppression des anciens, insertion des nouveaux
    const toRemove = currentMemberIds.filter((id) => !selectedMembers.includes(id))
    const toAdd = selectedMembers.filter((id) => !currentMemberIds.includes(id))

    if (toRemove.length > 0) {
      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', project.id)
        .in('user_id', toRemove)
    }

    if (toAdd.length > 0) {
      await supabase.from('project_members').insert(
        toAdd.map((userId) => ({ project_id: project.id, user_id: userId }))
      )
    }

    // Sync client_access
    if (form.client_id && form.client_id !== project.client_id) {
      await supabase
        .from('client_access')
        .delete()
        .eq('project_id', project.id)
      await supabase
        .from('client_access')
        .insert({ project_id: project.id, client_id: form.client_id })
    } else if (!form.client_id && project.client_id) {
      await supabase
        .from('client_access')
        .delete()
        .eq('project_id', project.id)
    }

    toast.success('Projet mis à jour')
    router.push(`/dashboard/projects/${project.id}`)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', project.id)

    if (error) {
      toast.error('Impossible de supprimer le projet')
      setDeleting(false)
      return
    }

    toast.success('Projet supprimé')
    router.push('/dashboard/projects')
    router.refresh()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm">
            Nom du projet <span className="text-[var(--destructive)]">*</span>
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="brief" className="text-sm">Brief</Label>
          <Textarea
            id="brief"
            value={form.brief}
            onChange={(e) => setForm({ ...form, brief: e.target.value })}
            rows={4}
            className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Project['status'] })}>
              <SelectTrigger className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                <SelectItem value="en_brief">En brief</SelectItem>
                <SelectItem value="en_production">En production</SelectItem>
                <SelectItem value="en_livraison">En livraison</SelectItem>
                <SelectItem value="livre">Livré</SelectItem>
                <SelectItem value="archive">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline" className="text-sm">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Client</Label>
          <Select
            value={form.client_id || 'none'}
            onValueChange={(v) => setForm({ ...form, client_id: v === 'none' ? '' : v })}
          >
            <SelectTrigger className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
              <SelectValue placeholder="Aucun client" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
              <SelectItem value="none">Aucun client</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Membres de l&apos;équipe</Label>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => {
              const selected = selectedMembers.includes(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() =>
                    setSelectedMembers((prev) =>
                      selected ? prev.filter((id) => id !== member.id) : [...prev, member.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                      : 'bg-[var(--input)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50'
                  }`}
                >
                  {member.full_name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] mt-6">
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
            >
              {loading && <Loader2 size={15} className="animate-spin mr-2" />}
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-[var(--border)] text-[var(--muted-foreground)]"
            >
              <Link href={`/dashboard/projects/${project.id}`}>Annuler</Link>
            </Button>
          </div>

          {canDelete && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="border-[var(--destructive)]/30 text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
            >
              <Trash2 size={14} className="mr-2" />
              Supprimer
            </Button>
          )}
        </div>
      </form>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle>Supprimer le projet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)] py-2">
            Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-[var(--foreground)]">{project.name}</span> ?
            Cette action est irréversible et supprimera toutes les tâches, messages et livraisons associés.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-[var(--border)] text-[var(--muted-foreground)]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[var(--destructive)] hover:opacity-90 text-white"
            >
              {deleting && <Loader2 size={14} className="animate-spin mr-2" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
