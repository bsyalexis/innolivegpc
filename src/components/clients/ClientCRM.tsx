'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus, Loader2, Search, Users, TrendingUp, Globe, Briefcase,
  ChevronRight, Building2, MapPin, Mail, Phone, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getInitials } from '@/lib/utils'

type ProjectInfo = { id: string; name: string; code?: string | null; status: string; budget?: number | null }

interface ClientRow {
  id: string
  email: string
  full_name: string
  created_at: string
  avatar_url?: string | null
  sector?: string | null
  city?: string | null
  mrr?: number | null
  portal_enabled?: boolean
  contact_email?: string | null
  contact_phone?: string | null
  projects: ProjectInfo[]
  projectCount: number
}

interface Props {
  clients: ClientRow[]
  kpis: { total: number; active: number; mrr: number; portal: number; budget: number }
}

type FilterKey = 'all' | 'active' | 'portal' | 'no_access'

const ACCENT_COLORS = [
  '#1E5FFF', '#FF4E1C', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4',
]

function initials(name: string) { return getInitials(name) }

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export default function ClientCRM({ clients: initialClients, kpis: initialKpis }: Props) {
  const supabase = createClient()
  const [clients, setClients] = useState<ClientRow[]>(initialClients)
  const [kpis, setKpis] = useState(initialKpis)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    sector: '',
    city: '',
    mrr: '',
    contact_email: '',
    contact_phone: '',
    portal_enabled: false,
  })

  const f = (k: keyof typeof form, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }))

  function resetForm() {
    setForm({ full_name: '', email: '', password: '', sector: '', city: '', mrr: '', contact_email: '', contact_phone: '', portal_enabled: false })
  }

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.sector?.toLowerCase().includes(search.toLowerCase()) || false
    const matchFilter =
      filter === 'all' ? true
      : filter === 'active' ? c.projectCount > 0
      : filter === 'portal' ? c.portal_enabled === true
      : !c.portal_enabled
    return matchSearch && matchFilter
  })

  async function handleCreate() {
    if (!form.email.trim() || !form.full_name.trim() || !form.password.trim()) return
    setLoading(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, full_name: form.full_name, password: form.password, role: 'CLIENT' }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Erreur création'); setLoading(false); return }

    // Enrichit avec les champs CRM
    await supabase.from('users').update({
      sector: form.sector || null,
      city: form.city || null,
      mrr: form.mrr ? parseFloat(form.mrr) : null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      portal_enabled: form.portal_enabled,
    }).eq('id', data.user.id)

    const newClient: ClientRow = {
      ...data.user,
      sector: form.sector || null,
      city: form.city || null,
      mrr: form.mrr ? parseFloat(form.mrr) : null,
      portal_enabled: form.portal_enabled,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      projects: [],
      projectCount: 0,
    }

    setClients((prev) => [newClient, ...prev])
    setKpis((prev) => ({
      ...prev,
      total: prev.total + 1,
      mrr: prev.mrr + (newClient.mrr ?? 0),
      portal: form.portal_enabled ? prev.portal + 1 : prev.portal,
    }))
    toast.success(`${form.full_name} créé(e)`)
    resetForm()
    setShowDrawer(false)
    setLoading(false)
  }

  async function togglePortal(clientId: string, current: boolean) {
    setTogglingId(clientId)
    const { error } = await supabase.from('users').update({ portal_enabled: !current }).eq('id', clientId)
    if (error) { toast.error('Erreur'); setTogglingId(null); return }
    setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, portal_enabled: !current } : c))
    setKpis((prev) => ({ ...prev, portal: current ? prev.portal - 1 : prev.portal + 1 }))
    toast.success(current ? 'Portail désactivé' : 'Portail activé')
    setTogglingId(null)
  }

  const KPI_DATA = [
    { label: 'Clients actifs', value: kpis.active, sub: `sur ${kpis.total} total`, color: 'var(--blue)', icon: <Users size={18} /> },
    { label: 'MRR cumulé', value: fmtEur(kpis.mrr), sub: 'mensuel récurrent', color: '#10b981', icon: <TrendingUp size={18} /> },
    { label: 'Budget en cours', value: fmtEur(kpis.budget), sub: 'projets actifs', color: 'var(--orange)', icon: <Briefcase size={18} /> },
    { label: 'Portail activé', value: kpis.portal, sub: `sur ${kpis.total} clients`, color: '#8b5cf6', icon: <Globe size={18} /> },
  ]

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_DATA.map(({ label, value, sub, color, icon }) => (
          <div key={label} className="bg-[var(--card)] rounded-[18px] border border-[var(--border)] p-4 space-y-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: color }}>
              {icon}
            </div>
            <div>
              <p className="headline text-[28px] leading-none">{value}</p>
              <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">{label}</p>
              <p className="text-[11px] text-[var(--muted-foreground)] opacity-60">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres + recherche + bouton */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, secteur..."
            className="pl-8 pr-4 py-2 text-[13px] rounded-full bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] transition-colors w-52"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'portal', 'no_access'] as FilterKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`pill text-[12px] border transition-colors ${filter === k ? 'bg-[var(--ink)] text-white border-transparent' : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--blue)]'}`}
            >
              {{ all: 'Tous', active: 'Actifs', portal: 'Portail activé', no_access: 'Sans accès' }[k]}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowDrawer(true)} className="ml-auto bg-[var(--ink)] hover:opacity-90 text-white rounded-full px-5 text-[13px]">
          <Plus size={14} className="mr-1.5" />
          Nouveau client
        </Button>
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
          <span>Client · Secteur</span>
          <span>Contact</span>
          <span>Projets</span>
          <span>MRR</span>
          <span>Portail</span>
          <span />
        </div>

        {filtered.length === 0 && (
          <p className="text-[13px] text-[var(--muted-foreground)] p-8 text-center">Aucun client trouvé.</p>
        )}

        {filtered.map((client) => {
          const color = ACCENT_COLORS[client.full_name.charCodeAt(0) % ACCENT_COLORS.length]
          return (
            <div key={client.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors items-center">
              {/* Client */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ background: color }}>
                  {initials(client.full_name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">{client.full_name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                    {client.sector && <span className="flex items-center gap-0.5"><Building2 size={9} />{client.sector}</span>}
                    {client.city && <span className="flex items-center gap-0.5"><MapPin size={9} />{client.city}</span>}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="text-[11px] text-[var(--muted-foreground)] space-y-0.5">
                <p className="flex items-center gap-1 truncate"><Mail size={9} />{client.contact_email ?? client.email}</p>
                {client.contact_phone && <p className="flex items-center gap-1"><Phone size={9} />{client.contact_phone}</p>}
              </div>

              {/* Projets */}
              <div>
                <p className="text-[13px] font-bold">{client.projectCount}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {client.projects.slice(0, 2).map((p) => p.code && (
                    <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--chip)] border border-[var(--border)] font-mono text-[var(--muted-foreground)]">
                      {p.code}
                    </span>
                  ))}
                  {client.projects.length > 2 && <span className="text-[10px] text-[var(--muted-foreground)]">+{client.projects.length - 2}</span>}
                </div>
              </div>

              {/* MRR */}
              <p className="text-[13px] font-semibold">
                {client.mrr ? fmtEur(Number(client.mrr)) : <span className="text-[var(--muted-foreground)]">—</span>}
              </p>

              {/* Portail */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePortal(client.id, !!client.portal_enabled)}
                  disabled={togglingId === client.id}
                  className="transition-colors hover:opacity-70"
                  title={client.portal_enabled ? 'Désactiver le portail' : 'Activer le portail'}
                >
                  {togglingId === client.id
                    ? <Loader2 size={18} className="animate-spin text-[var(--muted-foreground)]" />
                    : client.portal_enabled
                    ? <ToggleRight size={22} style={{ color: '#10b981' }} />
                    : <ToggleLeft size={22} className="text-[var(--muted-foreground)]" />}
                </button>
                <span className={`text-[10px] font-medium ${client.portal_enabled ? 'text-[#059669]' : 'text-[var(--muted-foreground)]'}`}>
                  {client.portal_enabled ? 'Actif' : 'Inactif'}
                </span>
              </div>

              {/* Actions */}
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="flex items-center gap-1 text-[12px] font-semibold text-[var(--blue)] hover:opacity-70 transition-opacity"
              >
                Fiche <ChevronRight size={13} />
              </Link>
            </div>
          )
        })}
      </div>

      {/* Drawer création */}
      <Sheet open={showDrawer} onOpenChange={(open) => { if (!open) resetForm(); setShowDrawer(open) }}>
        <SheetContent className="bg-[var(--background)] border-l border-[var(--border)] text-[var(--foreground)] flex flex-col p-0 w-full sm:w-[460px] gap-0">

          {/* En-tête fixe */}
          <div className="px-6 pt-6 pb-4 border-b border-[var(--border)] shrink-0">
            <SheetHeader>
              <SheetTitle className="headline text-[24px] uppercase tracking-tight">Nouveau client</SheetTitle>
            </SheetHeader>
            <p className="text-[12px] text-[var(--muted-foreground)] mt-1">Créez un accès client et renseignez son profil.</p>
          </div>

          {/* Corps scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Identité */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 rounded-full bg-[var(--blue)]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Identité</p>
              </div>
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--foreground)]">Nom complet <span className="text-[var(--orange)]">*</span></label>
                  <input
                    value={form.full_name}
                    onChange={(e) => f('full_name', e.target.value)}
                    placeholder="Prénom Nom"
                    className="w-full px-3.5 py-2.5 text-[13px] rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[#1E5FFF20] transition-all placeholder:text-[var(--muted-foreground)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[var(--foreground)]">Email <span className="text-[var(--orange)]">*</span></label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => f('email', e.target.value)}
                      placeholder="client@exemple.fr"
                      className="w-full px-3.5 py-2.5 text-[13px] rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[#1E5FFF20] transition-all placeholder:text-[var(--muted-foreground)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[var(--foreground)]">Mot de passe <span className="text-[var(--orange)]">*</span></label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => f('password', e.target.value)}
                      placeholder="Min. 8 caractères"
                      className="w-full px-3.5 py-2.5 text-[13px] rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[#1E5FFF20] transition-all placeholder:text-[var(--muted-foreground)]"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Profil entreprise */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 rounded-full bg-[var(--orange)]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Profil entreprise</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: 'sector' as const, label: 'Secteur', placeholder: 'Tech, Luxe, Retail...' },
                  { key: 'city' as const, label: 'Ville', placeholder: 'Paris' },
                  { key: 'contact_email' as const, label: 'Contact email', placeholder: 'contact@société.fr' },
                  { key: 'contact_phone' as const, label: 'Téléphone', placeholder: '+33 6 XX XX XX XX' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[var(--foreground)]">{label}</label>
                    <input
                      value={form[key] as string}
                      onChange={(e) => f(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3.5 py-2.5 text-[13px] rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[#1E5FFF20] transition-all placeholder:text-[var(--muted-foreground)]"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Financier & portail */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 rounded-full bg-[#10b981]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Financier & portail</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--foreground)]">MRR mensuel (€)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.mrr}
                    onChange={(e) => f('mrr', e.target.value)}
                    placeholder="500"
                    className="w-full px-3.5 py-2.5 text-[13px] rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[#1E5FFF20] transition-all placeholder:text-[var(--muted-foreground)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--foreground)]">Portail client</label>
                  <button
                    type="button"
                    onClick={() => f('portal_enabled', !form.portal_enabled)}
                    className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-all"
                    style={{
                      background: form.portal_enabled ? '#10b98112' : 'var(--card)',
                      borderColor: form.portal_enabled ? '#10b98160' : 'var(--border)',
                      color: form.portal_enabled ? '#059669' : 'var(--muted-foreground)',
                    }}
                  >
                    {form.portal_enabled ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                    {form.portal_enabled ? 'Activé' : 'Désactivé'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Pied fixe */}
          <div className="px-6 py-4 border-t border-[var(--border)] shrink-0">
            <button
              onClick={handleCreate}
              disabled={loading || !form.full_name.trim() || !form.email.trim() || !form.password.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--ink)', color: 'white' }}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Création en cours...</> : <><Plus size={14} />Créer le client</>}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
