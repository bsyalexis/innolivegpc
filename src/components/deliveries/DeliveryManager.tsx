'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Delivery, type User, DELIVERY_STATUS_LABELS, type DeliveryStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatDate, formatDateRelative } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Plus,
  Package,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
} from 'lucide-react'

const STATUS_STYLES: Record<DeliveryStatus, { color: string; icon: React.FC<{ size?: number }> }> = {
  en_attente: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  valide: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
  revision_demandee: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
}

interface DeliveryManagerProps {
  projectId: string
  currentUser: User
  initialDeliveries: Delivery[]
  isTeam: boolean
}

export default function DeliveryManager({
  projectId,
  currentUser,
  initialDeliveries,
  isTeam,
}: DeliveryManagerProps) {
  const supabase = createClient()
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [feedbackDialog, setFeedbackDialog] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    drive_folder_url: '',
    expires_at: '',
  })

  async function handleCreate() {
    if (!form.title.trim() || !form.drive_folder_url.trim()) return
    setLoading(true)

    const { data, error } = await supabase
      .from('deliveries')
      .insert({
        project_id: projectId,
        title: form.title.trim(),
        drive_folder_url: form.drive_folder_url.trim(),
        expires_at: form.expires_at || null,
        created_by: currentUser.id,
      })
      .select(`*, created_by_user:users!deliveries_created_by_fkey(full_name), feedback:delivery_feedback(*)`)
      .single()

    if (error || !data) {
      toast.error('Impossible de créer la livraison')
      setLoading(false)
      return
    }

    setDeliveries((prev) => [data as Delivery, ...prev])
    setForm({ title: '', drive_folder_url: '', expires_at: '' })
    setShowNewDialog(false)
    toast.success('Livraison créée')
    setLoading(false)
  }

  async function handleValidate(deliveryId: string) {
    const { error } = await supabase
      .from('deliveries')
      .update({ status: 'valide', validated_at: new Date().toISOString() })
      .eq('id', deliveryId)

    if (!error) {
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === deliveryId
            ? { ...d, status: 'valide' as DeliveryStatus, validated_at: new Date().toISOString() }
            : d
        )
      )
      toast.success('Livraison validée')
    }
  }

  async function handleRequestRevision(deliveryId: string) {
    if (!feedbackText.trim()) return
    setLoading(true)

    const [updateResult, feedbackResult] = await Promise.all([
      supabase
        .from('deliveries')
        .update({ status: 'revision_demandee' })
        .eq('id', deliveryId),
      supabase.from('delivery_feedback').insert({
        delivery_id: deliveryId,
        author_id: currentUser.id,
        comment: feedbackText.trim(),
      }),
    ])

    if (!updateResult.error) {
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === deliveryId ? { ...d, status: 'revision_demandee' as DeliveryStatus } : d
        )
      )
      toast.success('Révision demandée')
      setFeedbackText('')
      setFeedbackDialog(null)
    }
    setLoading(false)
    void feedbackResult
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        {isTeam && (
          <div className="flex justify-end">
            <Button
              onClick={() => setShowNewDialog(true)}
              className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
            >
              <Plus size={15} className="mr-2" />
              Nouvelle livraison
            </Button>
          </div>
        )}

        {/* Liste */}
        {deliveries.length === 0 && (
          <div className="text-center py-16 text-[var(--muted-foreground)]">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune livraison pour l&apos;instant.</p>
          </div>
        )}

        {deliveries.map((delivery) => {
          const statusInfo = STATUS_STYLES[delivery.status]
          const StatusIcon = statusInfo.icon
          const isExpired =
            delivery.expires_at && new Date(delivery.expires_at) < new Date()

          return (
            <div
              key={delivery.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 space-y-4"
            >
              {/* Header livraison */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Package size={18} className="text-[var(--primary)] shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      {delivery.title}
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {formatDateRelative(delivery.created_at)}
                      {delivery.created_by_user && (
                        <> · par {(delivery.created_by_user as { full_name: string }).full_name}</>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${statusInfo.color}`}>
                  <StatusIcon size={11} />
                  {DELIVERY_STATUS_LABELS[delivery.status]}
                </Badge>
              </div>

              {/* Lien Drive */}
              <a
                href={delivery.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
              >
                <ExternalLink size={13} />
                Accéder aux fichiers sur Google Drive
              </a>

              {/* Expiration */}
              {delivery.expires_at && (
                <p className={`text-xs ${isExpired ? 'text-[var(--destructive)]' : 'text-[var(--muted-foreground)]'}`}>
                  {isExpired ? 'Lien expiré le ' : 'Expire le '}
                  {formatDate(delivery.expires_at)}
                </p>
              )}

              {/* Feedback existants */}
              {delivery.feedback && delivery.feedback.length > 0 && (
                <div className="space-y-2 border-t border-[var(--border)] pt-3">
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Retours
                  </p>
                  {delivery.feedback.map((fb) => (
                    <div key={fb.id} className="bg-[var(--muted)] rounded-md px-3 py-2">
                      <p className="text-xs font-medium text-[var(--foreground)]">
                        {(fb.author as { full_name: string })?.full_name}
                        <span className="text-[var(--muted-foreground)] font-normal ml-2">
                          {formatDateRelative(fb.created_at)}
                        </span>
                      </p>
                      <p className="text-sm text-[var(--foreground)] mt-1">{fb.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions client */}
              {!isTeam && delivery.status === 'en_attente' && (
                <div className="flex gap-2 border-t border-[var(--border)] pt-3">
                  <Button
                    onClick={() => handleValidate(delivery.id)}
                    className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20"
                  >
                    <CheckCircle size={14} className="mr-2" />
                    Valider la livraison
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFeedbackDialog(delivery.id)}
                    className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle size={14} className="mr-2" />
                    Demander une révision
                  </Button>
                </div>
              )}

              {/* Actions équipe : reset si besoin */}
              {isTeam && delivery.status === 'revision_demandee' && (
                <div className="border-t border-[var(--border)] pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase
                        .from('deliveries')
                        .update({ status: 'en_attente' })
                        .eq('id', delivery.id)
                      setDeliveries((prev) =>
                        prev.map((d) =>
                          d.id === delivery.id
                            ? { ...d, status: 'en_attente' as DeliveryStatus }
                            : d
                        )
                      )
                      toast.success('Livraison remise en attente')
                    }}
                    className="text-xs border-[var(--border)] text-[var(--muted-foreground)]"
                  >
                    Remettre en attente (nouvelle version)
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dialog nouvelle livraison */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle>Nouvelle livraison</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-[var(--foreground)]">Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Version finale montage v2"
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-[var(--foreground)]">
                Lien Google Drive *
              </Label>
              <Input
                value={form.drive_folder_url}
                onChange={(e) => setForm({ ...form, drive_folder_url: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-[var(--foreground)]">
                Date d&apos;expiration (optionnel)
              </Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDialog(false)}
              className="border-[var(--border)] text-[var(--muted-foreground)]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !form.title.trim() || !form.drive_folder_url.trim()}
              className="bg-[var(--primary)] hover:bg-indigo-500 text-white"
            >
              {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog feedback révision */}
      <Dialog open={!!feedbackDialog} onOpenChange={(o) => !o && setFeedbackDialog(null)}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={16} />
              Demande de révision
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm text-[var(--foreground)] mb-1.5 block">
              Décrivez les modifications souhaitées *
            </Label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ex: Le générique de fin doit être revu, la musique est trop forte en voix off..."
              rows={4}
              className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackDialog(null)}
              className="border-[var(--border)] text-[var(--muted-foreground)]"
            >
              Annuler
            </Button>
            <Button
              onClick={() => feedbackDialog && handleRequestRevision(feedbackDialog)}
              disabled={loading || !feedbackText.trim()}
              className="bg-[var(--destructive)] hover:bg-red-600 text-white"
            >
              {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
