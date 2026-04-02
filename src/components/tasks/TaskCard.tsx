'use client'

import { type Task, type TaskStatus, type TaskPriority, TASK_STATUS_LABELS } from '@/types'
import { Badge } from '@/components/ui/badge'
import { formatDate, getInitials } from '@/lib/utils'
import { Calendar, MoreHorizontal, Pencil, Trash2, MoveRight, CheckSquare } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  basse: 'text-zinc-400',
  normale: 'text-blue-400',
  haute: 'text-orange-400',
  urgente: 'text-red-400',
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  basse: 'bg-zinc-500',
  normale: 'bg-blue-500',
  haute: 'bg-orange-500',
  urgente: 'bg-red-500',
}

interface TaskCardProps {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onMove: (status: TaskStatus) => void
}

export default function TaskCard({ task, onEdit, onDelete, onMove }: TaskCardProps) {
  const STATUSES: TaskStatus[] = ['a_faire', 'en_cours', 'bloque', 'termine']
  const otherStatuses = STATUSES.filter((s) => s !== task.status)

  const completedItems = task.checklist?.filter((c) => c.completed).length ?? 0
  const totalItems = task.checklist?.length ?? 0

  return (
    <div className="group bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--primary)]/30 transition-colors">
      {/* Priority + Menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          <span className={`text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-5 w-5 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity rounded">
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44 bg-[var(--card)] border-[var(--border)]"
          >
            <DropdownMenuItem
              onClick={onEdit}
              className="text-xs cursor-pointer"
            >
              <Pencil size={12} className="mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs cursor-pointer">
                <MoveRight size={12} className="mr-2" />
                Déplacer vers
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-[var(--card)] border-[var(--border)]">
                {otherStatuses.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onMove(s)}
                    className="text-xs cursor-pointer"
                  >
                    {TASK_STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-xs cursor-pointer text-[var(--destructive)] focus:text-[var(--destructive)]"
            >
              <Trash2 size={12} className="mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <p
        className="text-sm font-medium text-[var(--foreground)] leading-snug mb-2 cursor-pointer hover:text-[var(--primary)] transition-colors"
        onClick={onEdit}
      >
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Checklist progress */}
      {totalItems > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <CheckSquare size={11} className="text-[var(--muted-foreground)]" />
          <div className="flex-1 h-1 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] rounded-full transition-all"
              style={{ width: `${(completedItems / totalItems) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {completedItems}/{totalItems}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {task.due_date && (
          <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
            <Calendar size={10} />
            {formatDate(task.due_date)}
          </span>
        )}
        {task.assignee && (
          <div className="ml-auto">
            <Avatar className="h-5 w-5">
              <AvatarImage src={(task.assignee as { avatar_url?: string }).avatar_url || undefined} />
              <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] text-[8px] font-bold">
                {getInitials((task.assignee as { full_name: string }).full_name)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </div>
  )
}
