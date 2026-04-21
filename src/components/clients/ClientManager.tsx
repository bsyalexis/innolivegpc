'use client'

import { useState } from 'react'
import { type User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Loader2, Pencil, Trash2, FolderKanban, Users } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'

interface ClientWithProjects extends User {
  projectCount?: number
}

interface Props {
  clients: ClientWithProjects[]
}

type FormMode = 'create' | 'edit'

export default function ClientManager({ clients: initialClients }: Props) {
  const supabase = createClient()
  const [clients, setClients] = useState<ClientWithProjects[]>(initialClients)
  const [showDialog, setShowDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [mode, setMode] = useState<FormMode>('create')
  const [selectedClient, setSelectedClient] = useState<ClientWithProjects | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
  })

  function openCreate() {
    setMode('create')
    setForm({ email: '', full_name: '', password: '' })
    setSelectedClient(null)
    setShowDialog(true)
  }

  function openEdit(client: ClientWithProjects) {
    setMode('edit')
    setForm({ email: client.email, full_name: client.full_name, password: '' })
    setSelectedClient(client)
    setShowDialog(true)
  }

  function openDelete(client: ClientWithProjects) {
    setSelectedClient(client)
    setShowDeleteDialog(true)
  }

  async function handleSubmit() {
    if (mode === 'create') {
      if (!form.email.trim() || !form.full_name.trim() || !form.password.trim()) return
      setLoading(true)

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'CLIENT' }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Impossible de créer le client')
        setLoading(false)
        return
      }

      toast.success(`${form.full_name} a été créé(e)`)
      setClients((prev) => [...prev, { ...data.user, projectCount: 0 }])
      setShowDialog(false)
    } else {
      if (!selectedClient || !form.full_name.trim()) return
      setLoading(true)

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedClient.id, full_name: form.full_name }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Impossible de modifier le client')
        setLoading(false)
        return
      }

      toast.success('Client mis à jour')
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id
            ? { ...c, full_name: form.full_name }
            : c
        )
      )
      setShowDialog(false)
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!selectedClient) return
    setLoading(true)

    const res = await fetch(`/api/admin/users?id=${selectedClient.id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || 'Impossible de supprimer le client')
      setLoading(false)
      return
    }

    toast.success(`${selectedClient.full_name} a été supprimé(e)`)
    setClients((prev) => prev.filter((c) => c.id !== selectedClient.id))
    setShowDeleteDialog(false)
    setLoading(false)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Users size={15} />
            Clients ({clients.length})
          </h2>
          <Button
            onClick={openCreate}
            className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
          >
            <Plus size={14} className="mr-2" />
            Nouveau client
          </Button>
        </div>

        {clients.length === 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-8 text-center">
            <Users size={32} className="mx-auto mb-3 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-sm text-[var(--muted-foreground)]">Aucun client pour l&apos;instant.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 border-[var(--border)]">
              <Plus size={14} className="mr-2" />
              Créer le premier client
            </Button>
          </div>
        )}

        <div className="divide-y divide-[var(--border)] bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={client.avatar_url || undefined} />
                  <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold">
                    {getInitials(client.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{client.full_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{client.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {client.projectCount !== undefined && (
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 text-[var(--muted-foreground)] border-[var(--border)]"
                  >
                    <FolderKanban size={10} />
                    {client.projectCount} projet{client.projectCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                <p className="text-xs text-[var(--muted-foreground)] hidden md:block">
                  Depuis {formatDate(client.created_at)}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(client)}
                    className="h-7 w-7 p-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDelete(client)}
                    className="h-7 w-7 p-0 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog création / édition */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Nouveau client' : 'Modifier le client'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Nom complet *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Prénom Nom"
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="client@exemple.fr"
                disabled={mode === 'edit'}
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] disabled:opacity-50"
              />
              {mode === 'edit' && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  L&apos;email ne peut pas être modifié.
                </p>
              )}
            </div>
            {mode === 'create' && (
              <div className="space-y-1.5">
                <Label className="text-sm">Mot de passe provisoire *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="border-[var(--border)] text-[var(--muted-foreground)]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                !form.full_name.trim() ||
                (mode === 'create' && (!form.email.trim() || !form.password.trim()))
              }
              className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
            >
              {loading && <Loader2 size={14} className="animate-spin mr-2" />}
              {mode === 'create' ? 'Créer le client' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle>Supprimer le client</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-[var(--muted-foreground)]">
              Êtes-vous sûr de vouloir supprimer{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {selectedClient?.full_name}
              </span>{' '}
              ? Cette action est irréversible et supprimera l&apos;accès au portail client.
            </p>
            {(selectedClient?.projectCount ?? 0) > 0 && (
              <p className="text-sm text-orange-400 mt-3 flex items-center gap-1.5">
                <FolderKanban size={13} />
                Ce client est associé à {selectedClient?.projectCount} projet
                {(selectedClient?.projectCount ?? 0) > 1 ? 's' : ''}.
              </p>
            )}
          </div>
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
              disabled={loading}
              className="bg-[var(--destructive)] hover:opacity-90 text-white"
            >
              {loading && <Loader2 size={14} className="animate-spin mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
