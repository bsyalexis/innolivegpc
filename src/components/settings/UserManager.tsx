'use client'

import { useState } from 'react'
import { type User, type UserRole } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Plus, Loader2, UserCog } from 'lucide-react'
import { getInitials } from '@/lib/utils'

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-red-500/10 text-red-400 border-red-500/20',
  TEAM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CLIENT: 'bg-green-500/10 text-green-400 border-green-500/20',
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  TEAM: 'Équipe',
  CLIENT: 'Client',
}

interface UserManagerProps {
  users: User[]
}

export default function UserManager({ users: initialUsers }: UserManagerProps) {
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'TEAM' as UserRole,
    password: '',
  })

  async function handleInvite() {
    if (!form.email.trim() || !form.full_name.trim() || !form.password.trim()) return
    setLoading(true)

    // Création via Supabase Admin API (nécessite service role)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Impossible de créer l\'utilisateur')
      setLoading(false)
      return
    }

    toast.success(`${form.full_name} a été invité(e)`)
    setUsers((prev) => [...prev, data.user])
    setForm({ email: '', full_name: '', role: 'TEAM', password: '' })
    setShowInviteDialog(false)
    setLoading(false)
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
      toast.success('Rôle mis à jour')
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
            <UserCog size={15} />
            Utilisateurs ({users.length})
          </h2>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
          >
            <Plus size={14} className="mr-2" />
            Inviter un utilisateur
          </Button>
        </div>

        <div className="divide-y divide-[var(--border)] bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={user.role}
                  onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                >
                  <SelectTrigger className="h-7 w-36 text-xs bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                    <SelectItem value="ADMIN" className="text-xs">Administrateur</SelectItem>
                    <SelectItem value="TEAM" className="text-xs">Équipe</SelectItem>
                    <SelectItem value="CLIENT" className="text-xs">Client</SelectItem>
                  </SelectContent>
                </Select>

                <Badge variant="outline" className={`text-xs ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
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
                placeholder="prenom@exemple.fr"
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
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
            <div className="space-y-1.5">
              <Label className="text-sm">Rôle</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                  <SelectItem value="TEAM">Équipe</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              className="border-[var(--border)] text-[var(--muted-foreground)]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleInvite}
              disabled={loading || !form.email || !form.full_name || !form.password}
              className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
            >
              {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Créer l&apos;accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
