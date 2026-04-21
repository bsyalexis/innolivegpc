'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, User as UserIcon, Lock, Shield } from 'lucide-react'
import { getInitials } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  TEAM: 'Équipe',
  CLIENT: 'Client',
}

interface Props {
  user: User
}

export default function ProfileSettings({ user }: Props) {
  const supabase = createClient()
  const [fullName, setFullName] = useState(user.full_name)
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleSaveProfile() {
    if (!fullName.trim() || fullName === user.full_name) return
    setSavingProfile(true)

    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id)

    if (error) {
      toast.error('Impossible de mettre à jour le profil')
    } else {
      toast.success('Profil mis à jour')
    }
    setSavingProfile(false)
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast.error(error.message || 'Impossible de modifier le mot de passe')
    } else {
      toast.success('Mot de passe modifié')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profil */}
      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserIcon size={15} />
            Informations du profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar + rôle */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] text-lg font-bold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{user.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield size={11} className="text-[var(--muted-foreground)]" />
                <p className="text-xs text-[var(--muted-foreground)]">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-[var(--border)]" />

          <div className="space-y-1.5">
            <Label className="text-sm">Nom complet</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Adresse email</Label>
            <Input
              value={user.email}
              disabled
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] opacity-50"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              L&apos;email ne peut pas être modifié ici.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile || !fullName.trim() || fullName === user.full_name}
              className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
            >
              {savingProfile && <Loader2 size={14} className="animate-spin mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mot de passe */}
      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock size={15} />
            Changer le mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Nouveau mot de passe</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Confirmer le nouveau mot de passe</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le mot de passe"
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-[var(--destructive)]">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={
                savingPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword
              }
              className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
            >
              {savingPassword && <Loader2 size={14} className="animate-spin mr-2" />}
              Modifier le mot de passe
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
