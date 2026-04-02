'use client'

import { useState, useEffect } from 'react'
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
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { type User } from '@/types'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<User[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const [form, setForm] = useState({
    name: '',
    brief: '',
    status: 'en_brief',
    deadline: '',
    client_id: '',
  })

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('full_name')
      if (data) {
        setClients(data.filter((u) => u.role === 'CLIENT'))
        setTeamMembers(data.filter((u) => u.role !== 'CLIENT'))
      }
    }
    loadUsers()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    setLoading(true)
    const { data: authUser } = await supabase.auth.getUser()

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: form.name.trim(),
        brief: form.brief.trim() || null,
        status: form.status,
        deadline: form.deadline || null,
        client_id: form.client_id || null,
        created_by: authUser.user!.id,
      })
      .select()
      .single()

    if (error || !project) {
      toast.error('Erreur lors de la création du projet')
      setLoading(false)
      return
    }

    // Assigner les membres
    if (selectedMembers.length > 0) {
      await supabase.from('project_members').insert(
        selectedMembers.map((userId) => ({
          project_id: project.id,
          user_id: userId,
        }))
      )
    }

    // Créer l'accès client si un client est sélectionné
    if (form.client_id) {
      await supabase.from('client_access').insert({
        project_id: project.id,
        client_id: form.client_id,
      })
    }

    toast.success('Projet créé avec succès')
    router.push(`/dashboard/projects/${project.id}`)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Link href="/dashboard/projects">
            <ArrowLeft size={15} className="mr-1" />
            Retour
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Nouveau projet</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm text-[var(--foreground)]">
            Nom du projet <span className="text-[var(--destructive)]">*</span>
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Clip corporate Innolive 2025"
            required
            className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
          />
        </div>

        {/* Brief */}
        <div className="space-y-1.5">
          <Label htmlFor="brief" className="text-sm text-[var(--foreground)]">
            Brief
          </Label>
          <Textarea
            id="brief"
            value={form.brief}
            onChange={(e) => setForm({ ...form, brief: e.target.value })}
            placeholder="Décrivez le contexte, les objectifs, les livrables attendus..."
            rows={4}
            className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] resize-none"
          />
        </div>

        {/* Statut + Deadline */}
        <div className="grid grid-cols-2 gap-4">
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
                <SelectItem value="en_brief">En brief</SelectItem>
                <SelectItem value="en_production">En production</SelectItem>
                <SelectItem value="en_livraison">En livraison</SelectItem>
                <SelectItem value="livre">Livré</SelectItem>
                <SelectItem value="archive">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline" className="text-sm text-[var(--foreground)]">
              Deadline
            </Label>
            <Input
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
            />
          </div>
        </div>

        {/* Client */}
        <div className="space-y-1.5">
          <Label className="text-sm text-[var(--foreground)]">Client</Label>
          <Select
            value={form.client_id}
            onValueChange={(v) => setForm({ ...form, client_id: v })}
          >
            <SelectTrigger className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
              <SelectValue placeholder="Sélectionner un client" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Membres d'équipe */}
        <div className="space-y-2">
          <Label className="text-sm text-[var(--foreground)]">Membres de l&apos;équipe</Label>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => {
              const selected = selectedMembers.includes(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setSelectedMembers((prev) =>
                      selected
                        ? prev.filter((id) => id !== member.id)
                        : [...prev, member.id]
                    )
                  }}
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin mr-2" />
                Création...
              </>
            ) : (
              'Créer le projet'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="border-[var(--border)] text-[var(--muted-foreground)]"
          >
            <Link href="/dashboard/projects">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
