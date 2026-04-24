'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Loader2,
  User,
  Mail,
  Lock,
  Building2,
  MapPin,
  Phone,
  TrendingUp,
  Globe,
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Calendar,
  FolderKanban,
} from 'lucide-react'
import { type User as UserType, INVOICE_STATUS_LABELS, type InvoiceStatus } from '@/types'
import { formatDate } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Invoice {
  id: string
  title: string
  amount: number
  status: InvoiceStatus
  due_date: string | null
  paid_at: string | null
  description: string | null
  created_at: string
  project: { id: string; name: string } | null
}

interface ClientFull extends UserType {
  auth?: {
    email_confirmed: boolean
    last_sign_in: string | null
    created_at: string
  } | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onSaved?: (updated: Partial<UserType>) => void
}

// ─── Sections ────────────────────────────────────────────────────────────────

type Section = 'profil' | 'connexion' | 'factures'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'profil', label: 'Profil', icon: <User size={14} /> },
  { id: 'connexion', label: 'Connexion', icon: <Lock size={14} /> },
  { id: 'factures', label: 'Factures', icon: <Receipt size={14} /> },
]

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  en_attente: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  payee: 'bg-green-500/10 text-green-400 border-green-500/20',
  en_retard: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const INVOICE_STATUS_ICONS: Record<InvoiceStatus, React.ReactNode> = {
  en_attente: <Clock size={12} className="text-blue-400" />,
  payee: <CheckCircle2 size={12} className="text-green-400" />,
  en_retard: <AlertTriangle size={12} className="text-red-400" />,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientEditDrawer({ open, onOpenChange, clientId, onSaved }: Props) {
  const [section, setSection] = useState<Section>('profil')
  const [client, setClient] = useState<ClientFull | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  // Profil form state
  const [profil, setProfil] = useState({
    full_name: '',
    sector: '',
    city: '',
    contact_email: '',
    contact_phone: '',
    mrr: '',
    portal_enabled: false,
    avatar_url: '',
  })

  // Connexion form state
  const [connexion, setConnexion] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
  })

  // Nouvelle facture
  const [newInvoice, setNewInvoice] = useState({
    title: '',
    amount: '',
    status: 'en_attente' as InvoiceStatus,
    due_date: '',
    project_id: '',
    description: '',
  })
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null)

  // ─── Fetch data ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !clientId) return
    setSection('profil')
    fetchClient()
    fetchInvoices()
    fetchProjects()
  }, [open, clientId])

  async function fetchClient() {
    setLoadingData(true)
    const res = await fetch(`/api/admin/users?id=${clientId}`)
    if (res.ok) {
      const data: ClientFull = await res.json()
      setClient(data)
      setProfil({
        full_name: data.full_name ?? '',
        sector: data.sector ?? '',
        city: data.city ?? '',
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? '',
        mrr: data.mrr != null ? String(data.mrr) : '',
        portal_enabled: data.portal_enabled ?? false,
        avatar_url: data.avatar_url ?? '',
      })
      setConnexion({ email: data.email ?? '', password: '', passwordConfirm: '' })
    }
    setLoadingData(false)
  }

  async function fetchInvoices() {
    const res = await fetch(`/api/admin/invoices?client_id=${clientId}`)
    if (res.ok) {
      const data = await res.json()
      setInvoices(data as Invoice[])
    }
  }

  async function fetchProjects() {
    const res = await fetch(`/api/admin/projects?client_id=${clientId}`)
    if (res.ok) {
      const data = await res.json()
      setProjects(data as { id: string; name: string }[])
    }
  }

  // ─── Save profil ─────────────────────────────────────────────────────────

  async function saveProfil() {
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: clientId,
        full_name: profil.full_name,
        sector: profil.sector,
        city: profil.city,
        contact_email: profil.contact_email,
        contact_phone: profil.contact_phone,
        mrr: profil.mrr,
        portal_enabled: profil.portal_enabled,
        avatar_url: profil.avatar_url,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la sauvegarde')
    } else {
      toast.success('Profil mis à jour')
      setClient((prev) => prev ? { ...prev, ...data.user } : null)
      onSaved?.(data.user)
    }
    setSaving(false)
  }

  // ─── Save connexion ───────────────────────────────────────────────────────

  async function saveConnexion() {
    if (!connexion.email.trim()) {
      toast.error("L'email est requis")
      return
    }
    if (connexion.password && connexion.password !== connexion.passwordConfirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (connexion.password && connexion.password.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères')
      return
    }

    setSaving(true)
    const payload: Record<string, string> = { id: clientId, email: connexion.email }
    if (connexion.password) payload.password = connexion.password

    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la mise à jour')
    } else {
      toast.success('Identifiants mis à jour')
      setConnexion((prev) => ({ ...prev, password: '', passwordConfirm: '' }))
      onSaved?.(data.user)
    }
    setSaving(false)
  }

  // ─── Invoice CRUD ─────────────────────────────────────────────────────────

  async function createInvoice() {
    if (!newInvoice.title || !newInvoice.amount) {
      toast.error('Titre et montant obligatoires')
      return
    }
    setSavingInvoice(true)
    const res = await fetch('/api/admin/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        title: newInvoice.title,
        amount: newInvoice.amount,
        status: newInvoice.status,
        due_date: newInvoice.due_date || null,
        project_id: newInvoice.project_id || null,
        description: newInvoice.description || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la création')
    } else {
      toast.success('Facture créée')
      setInvoices((prev) => [{ ...data, project: null }, ...prev])
      setNewInvoice({ title: '', amount: '', status: 'en_attente', due_date: '', project_id: '', description: '' })
      setShowNewInvoice(false)
      fetchInvoices()
    }
    setSavingInvoice(false)
  }

  async function markInvoicePaid(invoice: Invoice) {
    const res = await fetch('/api/admin/invoices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: invoice.id, status: 'payee' }),
    })
    if (res.ok) {
      toast.success('Facture marquée comme payée')
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === invoice.id ? { ...i, status: 'payee', paid_at: new Date().toISOString() } : i
        )
      )
    }
  }

  async function deleteInvoice(id: string) {
    setDeletingInvoiceId(id)
    const res = await fetch(`/api/admin/invoices?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Facture supprimée')
      setInvoices((prev) => prev.filter((i) => i.id !== id))
    } else {
      toast.error('Erreur lors de la suppression')
    }
    setDeletingInvoiceId(null)
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {label}
        </Label>
        {children}
        {hint && <p className="text-[10px] text-[var(--muted-foreground)]">{hint}</p>}
      </div>
    )
  }

  function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[var(--primary)]">{icon}</div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    )
  }

  const inputClass = 'bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] text-sm h-8 font-mono focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30'

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-[var(--sidebar-bg)] border-l border-[var(--border)] flex flex-col p-0 overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[var(--border)] shrink-0">
          <SheetTitle className="text-left">
            <span className="text-[11px] font-mono text-[var(--muted-foreground)]">public.users</span>
            <div className="text-lg font-bold text-[var(--foreground)] mt-0.5">
              {loadingData ? '...' : client?.full_name ?? ''}
            </div>
            {client?.email && (
              <p className="text-xs text-[var(--muted-foreground)] font-normal mt-0.5 font-mono">{client.email}</p>
            )}
          </SheetTitle>

          {/* Auth meta */}
          {client?.auth && (
            <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1">
                {client.auth.email_confirmed
                  ? <CheckCircle2 size={10} className="text-green-400" />
                  : <AlertTriangle size={10} className="text-orange-400" />}
                Email {client.auth.email_confirmed ? 'confirmé' : 'non confirmé'}
              </span>
              {client.auth.last_sign_in && (
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  Dernière connexion : {formatDate(client.auth.last_sign_in)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                Compte créé : {formatDate(client.auth.created_at)}
              </span>
            </div>
          )}
        </SheetHeader>

        {/* Tab navigation */}
        <div className="flex border-b border-[var(--border)] shrink-0">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                section === s.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {s.icon}
              {s.label}
              {s.id === 'factures' && invoices.length > 0 && (
                <span className="ml-1 bg-[var(--primary)]/20 text-[var(--primary)] text-[9px] font-bold rounded-full px-1.5 py-0.5">
                  {invoices.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingData ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={20} className="animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : (
            <>
              {/* ── PROFIL ── */}
              {section === 'profil' && (
                <div className="p-6 space-y-6">
                  {/* Identité */}
                  <div>
                    <SectionTitle icon={<User size={13} />} label="Identité" />
                    <div className="space-y-4">
                      <Field label="Nom complet">
                        <Input
                          value={profil.full_name}
                          onChange={(e) => setProfil({ ...profil, full_name: e.target.value })}
                          placeholder="Prénom Nom"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="URL avatar">
                        <Input
                          value={profil.avatar_url}
                          onChange={(e) => setProfil({ ...profil, avatar_url: e.target.value })}
                          placeholder="https://..."
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>

                  <Separator className="bg-[var(--border)]" />

                  {/* Entreprise */}
                  <div>
                    <SectionTitle icon={<Building2 size={13} />} label="Entreprise" />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Secteur d'activité">
                        <Input
                          value={profil.sector}
                          onChange={(e) => setProfil({ ...profil, sector: e.target.value })}
                          placeholder="Ex : Audiovisuel"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Ville">
                        <Input
                          value={profil.city}
                          onChange={(e) => setProfil({ ...profil, city: e.target.value })}
                          placeholder="Ex : Paris"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>

                  <Separator className="bg-[var(--border)]" />

                  {/* Contact */}
                  <div>
                    <SectionTitle icon={<Mail size={13} />} label="Contact" />
                    <div className="space-y-4">
                      <Field label="Email de contact" hint="Différent de l'email de connexion si besoin">
                        <Input
                          type="email"
                          value={profil.contact_email}
                          onChange={(e) => setProfil({ ...profil, contact_email: e.target.value })}
                          placeholder="contact@client.fr"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Téléphone">
                        <Input
                          type="tel"
                          value={profil.contact_phone}
                          onChange={(e) => setProfil({ ...profil, contact_phone: e.target.value })}
                          placeholder="+33 6 00 00 00 00"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>

                  <Separator className="bg-[var(--border)]" />

                  {/* Business */}
                  <div>
                    <SectionTitle icon={<TrendingUp size={13} />} label="Business" />
                    <div className="space-y-4">
                      <Field label="MRR (€ / mois)" hint="Revenu mensuel récurrent">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">€</span>
                          <Input
                            type="number"
                            value={profil.mrr}
                            onChange={(e) => setProfil({ ...profil, mrr: e.target.value })}
                            placeholder="0"
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                      </Field>

                      <Field label="Portail client">
                        <div className="flex items-center justify-between bg-[var(--input)] border border-[var(--border)] rounded-md px-3 h-8">
                          <span className="text-sm text-[var(--foreground)]">
                            {profil.portal_enabled ? 'Activé' : 'Désactivé'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setProfil({ ...profil, portal_enabled: !profil.portal_enabled })}
                            className="transition-colors"
                          >
                            {profil.portal_enabled
                              ? <ToggleRight size={22} style={{ color: '#10b981' }} />
                              : <ToggleLeft size={22} className="text-[var(--muted-foreground)]" />}
                          </button>
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Save */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={saveProfil}
                      disabled={saving}
                      className="bg-[var(--primary)] hover:bg-indigo-500 text-white gap-1.5"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Enregistrer le profil
                    </Button>
                  </div>
                </div>
              )}

              {/* ── CONNEXION ── */}
              {section === 'connexion' && (
                <div className="p-6 space-y-6">
                  {/* Email */}
                  <div>
                    <SectionTitle icon={<Mail size={13} />} label="Adresse email" />
                    <div className="space-y-4">
                      <Field label="Email de connexion" hint="Utilisé pour se connecter au portail client">
                        <Input
                          type="email"
                          value={connexion.email}
                          onChange={(e) => setConnexion({ ...connexion, email: e.target.value })}
                          placeholder="client@exemple.fr"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>

                  <Separator className="bg-[var(--border)]" />

                  {/* Password */}
                  <div>
                    <SectionTitle icon={<Lock size={13} />} label="Mot de passe" />
                    <div className="space-y-4">
                      <Field label="Nouveau mot de passe" hint="Laissez vide pour ne pas modifier">
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={connexion.password}
                            onChange={(e) => setConnexion({ ...connexion, password: e.target.value })}
                            placeholder="Minimum 8 caractères"
                            className={`${inputClass} pr-9`}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </Field>

                      <Field label="Confirmer le mot de passe">
                        <div className="relative">
                          <Input
                            type={showPasswordConfirm ? 'text' : 'password'}
                            value={connexion.passwordConfirm}
                            onChange={(e) => setConnexion({ ...connexion, passwordConfirm: e.target.value })}
                            placeholder="Répéter le mot de passe"
                            className={`${inputClass} pr-9 ${
                              connexion.passwordConfirm && connexion.password !== connexion.passwordConfirm
                                ? 'border-red-500/50 focus:border-red-500'
                                : ''
                            }`}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            {showPasswordConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                        {connexion.passwordConfirm && connexion.password !== connexion.passwordConfirm && (
                          <p className="text-[10px] text-red-400">Les mots de passe ne correspondent pas</p>
                        )}
                      </Field>

                      {/* Strength indicator */}
                      {connexion.password && (
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            {[8, 12, 16].map((len, i) => (
                              <div
                                key={len}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  connexion.password.length >= len
                                    ? i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-400' : 'bg-green-500'
                                    : 'bg-[var(--border)]'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            {connexion.password.length < 8
                              ? 'Trop court'
                              : connexion.password.length < 12
                              ? 'Moyen'
                              : connexion.password.length < 16
                              ? 'Fort'
                              : 'Très fort'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-[var(--primary)]">Information</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Le changement d&apos;email et de mot de passe est appliqué immédiatement.
                      Le client doit se reconnecter après modification.
                    </p>
                  </div>

                  {/* Save */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={saveConnexion}
                      disabled={saving || (connexion.password !== '' && connexion.password !== connexion.passwordConfirm)}
                      className="bg-[var(--primary)] hover:bg-indigo-500 text-white gap-1.5"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Mettre à jour les identifiants
                    </Button>
                  </div>
                </div>
              )}

              {/* ── FACTURES ── */}
              {section === 'factures' && (
                <div className="p-6 space-y-5">
                  {/* Summary */}
                  {invoices.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {(
                        [
                          {
                            label: 'Total',
                            value: invoices.reduce((s, i) => s + Number(i.amount), 0),
                            color: 'text-[var(--foreground)]',
                          },
                          {
                            label: 'Payé',
                            value: invoices.filter((i) => i.status === 'payee').reduce((s, i) => s + Number(i.amount), 0),
                            color: 'text-green-400',
                          },
                          {
                            label: 'En attente',
                            value: invoices.filter((i) => i.status !== 'payee').reduce((s, i) => s + Number(i.amount), 0),
                            color: 'text-blue-400',
                          },
                        ] as { label: string; value: number; color: string }[]
                      ).map(({ label, value, color }) => (
                        <div key={label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
                          <p className={`text-base font-bold ${color}`}>
                            {value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add invoice button */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                      Factures ({invoices.length})
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setShowNewInvoice(!showNewInvoice)}
                      className="h-7 text-xs bg-[var(--primary)] hover:bg-indigo-500 text-white gap-1"
                    >
                      <Plus size={12} />
                      Nouvelle facture
                    </Button>
                  </div>

                  {/* New invoice form */}
                  {showNewInvoice && (
                    <div className="bg-[var(--card)] border border-[var(--primary)]/30 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-[var(--primary)]">Nouvelle facture</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Titre *">
                          <Input
                            value={newInvoice.title}
                            onChange={(e) => setNewInvoice({ ...newInvoice, title: e.target.value })}
                            placeholder="Ex : Acompte projet X"
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Montant (€) *">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">€</span>
                            <Input
                              type="number"
                              value={newInvoice.amount}
                              onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                              placeholder="0"
                              className={`${inputClass} pl-7`}
                            />
                          </div>
                        </Field>
                        <Field label="Statut">
                          <select
                            value={newInvoice.status}
                            onChange={(e) => setNewInvoice({ ...newInvoice, status: e.target.value as InvoiceStatus })}
                            className={`${inputClass} w-full rounded-md px-3 cursor-pointer`}
                          >
                            {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Échéance">
                          <Input
                            type="date"
                            value={newInvoice.due_date}
                            onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                            className={inputClass}
                          />
                        </Field>
                        {projects.length > 0 && (
                          <Field label="Projet lié" hint="Optionnel">
                            <select
                              value={newInvoice.project_id}
                              onChange={(e) => setNewInvoice({ ...newInvoice, project_id: e.target.value })}
                              className={`${inputClass} w-full rounded-md px-3 cursor-pointer col-span-2`}
                            >
                              <option value="">— Aucun projet —</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </Field>
                        )}
                        <div className="col-span-2">
                          <Field label="Description">
                            <Input
                              value={newInvoice.description}
                              onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                              placeholder="Note interne (optionnel)"
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowNewInvoice(false)}
                          className="h-7 text-xs text-[var(--muted-foreground)]"
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={createInvoice}
                          disabled={savingInvoice || !newInvoice.title || !newInvoice.amount}
                          className="h-7 text-xs bg-[var(--primary)] hover:bg-indigo-500 text-white gap-1"
                        >
                          {savingInvoice ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                          Créer
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Invoice list */}
                  {invoices.length === 0 ? (
                    <div className="text-center py-10 text-[var(--muted-foreground)]">
                      <Receipt size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Aucune facture pour ce client.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-start gap-3"
                        >
                          <div className="mt-0.5">{INVOICE_STATUS_ICONS[invoice.status]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{invoice.title}</p>
                                {invoice.description && (
                                  <p className="text-[11px] text-[var(--muted-foreground)] truncate">{invoice.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--muted-foreground)] flex-wrap">
                                  {(invoice.project as { id: string; name: string } | null)?.name && (
                                    <span className="flex items-center gap-0.5">
                                      <FolderKanban size={9} />
                                      {(invoice.project as { id: string; name: string }).name}
                                    </span>
                                  )}
                                  <span>{formatDate(invoice.created_at)}</span>
                                  {invoice.due_date && (
                                    <span className={invoice.status === 'en_retard' ? 'text-red-400' : ''}>
                                      Éch. {formatDate(invoice.due_date)}
                                    </span>
                                  )}
                                  {invoice.paid_at && (
                                    <span className="text-green-400">Payée {formatDate(invoice.paid_at)}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-[var(--foreground)]">
                                  {Number(invoice.amount).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] py-0 mt-1 ${INVOICE_STATUS_COLORS[invoice.status]}`}
                                >
                                  {INVOICE_STATUS_LABELS[invoice.status]}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            {invoice.status !== 'payee' && (
                              <button
                                onClick={() => markInvoicePaid(invoice)}
                                className="text-[var(--muted-foreground)] hover:text-green-400 transition-colors"
                                title="Marquer comme payée"
                              >
                                <CheckCircle2 size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteInvoice(invoice.id)}
                              disabled={deletingInvoiceId === invoice.id}
                              className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                              title="Supprimer"
                            >
                              {deletingInvoiceId === invoice.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Refresh */}
                  <button
                    onClick={fetchInvoices}
                    className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <RefreshCw size={10} />
                    Actualiser
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
