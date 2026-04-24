import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from '@/types'
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingDown,
  Euro,
} from 'lucide-react'

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  en_attente: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  payee: 'bg-green-500/10 text-green-400 border-green-500/20',
  en_retard: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const STATUS_ICONS: Record<InvoiceStatus, React.ReactNode> = {
  en_attente: <Clock size={13} className="text-blue-400" />,
  payee: <CheckCircle2 size={13} className="text-green-400" />,
  en_retard: <AlertTriangle size={13} className="text-red-400" />,
}

type InvoiceRow = {
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

export default async function ClientFacturesPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser || currentUser.role !== 'CLIENT') redirect('/dashboard')

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, title, amount, status, due_date, paid_at, description, created_at,
      project:projects(id, name)
    `)
    .eq('client_id', authUser.id)
    .order('created_at', { ascending: false })

  const rows = (invoices ?? []) as unknown as InvoiceRow[]

  const totalAmount = rows.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const paidAmount = rows.filter((i) => i.status === 'payee').reduce((sum, inv) => sum + Number(inv.amount), 0)
  const pendingAmount = rows.filter((i) => i.status === 'en_attente').reduce((sum, inv) => sum + Number(inv.amount), 0)
  const overdueAmount = rows.filter((i) => i.status === 'en_retard').reduce((sum, inv) => sum + Number(inv.amount), 0)

  const formatAmount = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Factures</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Suivi de vos paiements et factures avec Innolive
        </p>
      </div>

      {/* Overdue alert */}
      {rows.some((i) => i.status === 'en_retard') && (
        <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Paiement en retard</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {rows.filter((i) => i.status === 'en_retard').length} facture{rows.filter((i) => i.status === 'en_retard').length > 1 ? 's' : ''} en retard
              pour un montant total de {formatAmount(overdueAmount)}.
              Contactez votre responsable Innolive pour régulariser.
            </p>
          </div>
        </div>
      )}

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Euro size={13} className="text-[var(--muted-foreground)]" />
            <span className="text-xs text-[var(--muted-foreground)]">Total facturé</span>
          </div>
          <p className="text-lg font-bold text-[var(--foreground)]">{formatAmount(totalAmount)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={13} className="text-green-400" />
            <span className="text-xs text-[var(--muted-foreground)]">Payé</span>
          </div>
          <p className="text-lg font-bold text-green-400">{formatAmount(paidAmount)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={13} className="text-blue-400" />
            <span className="text-xs text-[var(--muted-foreground)]">En attente</span>
          </div>
          <p className="text-lg font-bold text-blue-400">{formatAmount(pendingAmount)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={13} className="text-red-400" />
            <span className="text-xs text-[var(--muted-foreground)]">En retard</span>
          </div>
          <p className="text-lg font-bold text-red-400">{formatAmount(overdueAmount)}</p>
        </div>
      </div>

      {/* Invoices list */}
      {rows.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <Receipt size={36} className="mx-auto mb-3 opacity-30 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Aucune facture pour le moment.</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Vos factures apparaîtront ici dès qu&apos;elles seront émises.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
            Toutes les factures ({rows.length})
          </h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            {rows.map((invoice, index) => (
              <div
                key={invoice.id}
                className={`flex items-start gap-4 px-5 py-4 ${
                  index < rows.length - 1 ? 'border-b border-[var(--border)]' : ''
                } ${invoice.status === 'en_retard' ? 'bg-red-500/[0.03]' : ''}`}
              >
                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    invoice.status === 'payee'
                      ? 'bg-green-500/10'
                      : invoice.status === 'en_retard'
                      ? 'bg-red-500/10'
                      : 'bg-blue-500/10'
                  }`}
                >
                  {STATUS_ICONS[invoice.status]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{invoice.title}</p>
                      {invoice.description && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">
                          {invoice.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--muted-foreground)] flex-wrap">
                        {(invoice.project as { id: string; name: string } | null)?.name && (
                          <Link
                            href={`/client/${(invoice.project as { id: string; name: string }).id}`}
                            className="hover:text-[var(--primary)] transition-colors"
                          >
                            {(invoice.project as { id: string; name: string }).name}
                          </Link>
                        )}
                        <span>Émise le {formatDate(invoice.created_at)}</span>
                        {invoice.due_date && (
                          <span
                            className={
                              invoice.status === 'en_retard' ? 'text-red-400 font-medium' : ''
                            }
                          >
                            Échéance : {formatDate(invoice.due_date)}
                          </span>
                        )}
                        {invoice.paid_at && (
                          <span className="text-green-400">
                            Payée le {formatDate(invoice.paid_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount + badge */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-base font-bold text-[var(--foreground)]">
                        {formatAmount(Number(invoice.amount))}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 ${STATUS_COLORS[invoice.status]}`}
                      >
                        {INVOICE_STATUS_LABELS[invoice.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact CTA */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 text-center space-y-2">
        <p className="text-sm text-[var(--muted-foreground)]">
          Une question sur une facture ?
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Contactez votre responsable Innolive directement via la messagerie de votre projet.
        </p>
      </div>
    </div>
  )
}
