'use client'

import { type Notification, type NotificationType } from '@/types'
import { formatDateRelative } from '@/lib/utils'
import Link from 'next/link'
import {
  MessageSquare,
  Package,
  CheckCircle,
  XCircle,
  CheckSquare,
  FolderKanban,
  Bell,
} from 'lucide-react'

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.FC<{ size?: number; className?: string }>; color: string; label: string }
> = {
  nouveau_message: { icon: MessageSquare, color: 'text-green-400', label: 'Message' },
  livraison_disponible: { icon: Package, color: 'text-purple-400', label: 'Livraison' },
  livraison_validee: { icon: CheckCircle, color: 'text-green-400', label: 'Validation' },
  revision_demandee: { icon: XCircle, color: 'text-red-400', label: 'Révision' },
  tache_assignee: { icon: CheckSquare, color: 'text-blue-400', label: 'Tâche' },
  projet_mis_a_jour: { icon: FolderKanban, color: 'text-[var(--primary)]', label: 'Projet' },
}

interface NotificationListProps {
  notifications: Notification[]
}

export default function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--muted-foreground)]">
        <Bell size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aucune notification pour l&apos;instant.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {notifications.map((notif) => {
        const config = TYPE_CONFIG[notif.type]
        const Icon = config.icon

        const content = (
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
              !notif.read
                ? 'bg-[var(--primary)]/5 border-[var(--primary)]/20'
                : 'bg-[var(--card)] border-[var(--border)]'
            }`}
          >
            <div className={`mt-0.5 shrink-0 ${config.color}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">{notif.title}</p>
              {notif.body && (
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">
                  {notif.body}
                </p>
              )}
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1.5">
                {formatDateRelative(notif.created_at)}
              </p>
            </div>
            {!notif.read && (
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0 mt-1.5" />
            )}
          </div>
        )

        if (notif.link) {
          return (
            <Link key={notif.id} href={notif.link} className="block hover:opacity-90">
              {content}
            </Link>
          )
        }

        return <div key={notif.id}>{content}</div>
      })}
    </div>
  )
}
