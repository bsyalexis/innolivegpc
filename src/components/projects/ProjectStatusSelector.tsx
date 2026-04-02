'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { type ProjectStatus, PROJECT_STATUS_LABELS } from '@/types'

interface Props {
  projectId: string
  currentStatus: string
}

export default function ProjectStatusSelector({ projectId, currentStatus }: Props) {
  const supabase = createClient()
  const router = useRouter()

  async function handleChange(newStatus: string) {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId)

    if (error) {
      toast.error('Impossible de mettre à jour le statut')
      return
    }
    toast.success('Statut mis à jour')
    router.refresh()
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-40 text-xs bg-[var(--input)] border-[var(--border)] text-[var(--foreground)]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[var(--card)] border-[var(--border)]">
        {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((status) => (
          <SelectItem key={status} value={status} className="text-xs">
            {PROJECT_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
