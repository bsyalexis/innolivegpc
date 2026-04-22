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
import { Loader2, ArrowLeft, X, Plus } from 'lucide-react'
import Link from 'next/link'
import { type User } from '@/types'

const ACCENT_COLORS = [
  '#1E5FFF', '#FF4E1C', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#0a0a0a',
]

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<User[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [form, setForm] = useState({
    name: '',
    brief: '',
    status: 'en_brief',
    deadline: '',
    client_id: '',
    category: '',
    color: '#1E5FFF',
    code: '',
    budget: '',
    tags: [] as string[],
    lead_id: '',
  })

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase.from('users').select('*').order('full_name')
      if (data) {
        setClients(data.filter((u) => u.role === 'CLIENT'))
        setTeamMembers(data.filter((u) => u.role !== 'CLIENT'))
      }
    }
    loadUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addTag() {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] })
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })
  }

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
        category: form.category || null,
        color: form.color,
        code: form.code.trim() || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        tags: form.tags.length > 0 ? form.tags : null,
        lead_id: form.lead_id || null,
        created_by: authUser.user!.id,
      })
      .select()
      .single()

    if (error || !project) {
      toast.error('Erreur lors de la création du projet')
      setLoading(false)
      return
    }

    if (selectedMembers.length > 0) {
      await supabase.from('project_members').insert(
        selectedMembers.map((userId) => ({ project_id: project.id, user_id: userId }))
      )
    }

    if (form.client_id) {
      await supabase.from('client_access').insert({
        project_id: project.id,
        client_id: form.client_id,
      })
    }

    toast.success('Projet créé avec succès')
    router.push(`/dashboard/projects/${project.id}`)
  }

  const f = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v })

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="text-[var(--muted-foreground)]">
          <Link href="/dashboard/projects"><ArrowLeft size={15} className="mr-1" />Retour</Link>
        </Button>
      </div>

      <div className="mb-6">
        <p className="text-[11px] text-[var(--muted-foreground)] tracking-widest uppercase mb-1">Nouveau projet</p>
        <h1 className="headline text-[32px] uppercase">Créer un <span className="highlight-blue">projet</span></h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom + Code */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-sm">Nom du projet <span className="text-[var(--destructive)]">*</span></Label>
            <Input value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Ex: Clip corporate Innolive 2025" required className="bg-[var(--input)] border-[var(--border)]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Code projet</Label>
            <Input value={form.code} onChange={(e) => f('code', e.target.value.toUpperCase())} placeholder="EVA-VR" className="bg-[var(--input)] border-[var(--border)] font-mono" />
          </div>
        </div>

        {/* Catégorie + Couleur */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Catégorie</Label>
            <Select value={form.category} onValueChange={(v) => f('category', v)}>
              <SelectTrigger className="bg-[var(--input)] border-[var(--border)]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                <SelectItem value="creation">Création</SelectItem>
                <SelectItem value="publicite">Publicité</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="acquisition">Acquisition</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Couleur accent</Label>
            <div className="flex items-center gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => f('color', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-[var(--foreground)] scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Brief */}
        <div className="space-y-1.5">
          <Label className="text-sm">Brief</Label>
          <Textarea value={form.brief} onChange={(e) => f('brief', e.target.value)} placeholder="Contexte, objectifs, livrables attendus..." rows={4} className="bg-[var(--input)] border-[var(--border)] resize-none" />
        </div>

        {/* Statut + Deadline + Budget */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Statut</Label>
            <Select value={form.status} onValueChange={(v) => f('status', v)}>
              <SelectTrigger className="bg-[var(--input)] border-[var(--border)]"><SelectValue /></SelectTrigger>
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
            <Label className="text-sm">Deadline</Label>
            <Input type="date" value={form.deadline} onChange={(e) => f('deadline', e.target.value)} className="bg-[var(--input)] border-[var(--border)]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Budget (€)</Label>
            <Input type="number" min="0" step="100" value={form.budget} onChange={(e) => f('budget', e.target.value)} placeholder="5000" className="bg-[var(--input)] border-[var(--border)]" />
          </div>
        </div>

        {/* Client + Lead */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Client</Label>
            <Select value={form.client_id} onValueChange={(v) => f('client_id', v)}>
              <SelectTrigger className="bg-[var(--input)] border-[var(--border)]"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Chef de projet (Lead)</Label>
            <Select value={form.lead_id} onValueChange={(v) => f('lead_id', v)}>
              <SelectTrigger className="bg-[var(--input)] border-[var(--border)]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-sm">Tags métier</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="Ex: brand, motion, corporate..."
              className="bg-[var(--input)] border-[var(--border)]"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag} className="shrink-0 border-[var(--border)]">
              <Plus size={14} />
            </Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-full bg-[var(--chip)] border border-[var(--border)] text-[var(--foreground)]">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Membres */}
        <div className="space-y-2">
          <Label className="text-sm">Membres de l&apos;équipe</Label>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => {
              const selected = selectedMembers.includes(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMembers((prev) => selected ? prev.filter((id) => id !== member.id) : [...prev, member.id])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected ? 'bg-[var(--blue)] border-[var(--blue)] text-white' : 'bg-[var(--input)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--blue)]'}`}
                >
                  {member.full_name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading || !form.name.trim()} className="bg-[var(--blue)] hover:opacity-90 text-white">
            {loading ? <><Loader2 size={15} className="animate-spin mr-2" />Création...</> : 'Créer le projet'}
          </Button>
          <Button type="button" variant="outline" asChild className="border-[var(--border)] text-[var(--muted-foreground)]">
            <Link href="/dashboard/projects">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
