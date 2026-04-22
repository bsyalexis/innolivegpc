import type { TaskPriority } from '@/types'

const CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  basse:   { color: 'var(--muted-foreground)', label: 'Basse' },
  normale: { color: 'var(--blue)',             label: 'Normale' },
  haute:   { color: 'var(--orange)',           label: 'Haute' },
  urgente: { color: '#ef4444',                 label: 'Urgente' },
}

export default function PriorityBadge({
  priority,
  showLabel = false,
}: {
  priority: TaskPriority
  showLabel?: boolean
}) {
  const { color, label } = CONFIG[priority]
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {showLabel && (
        <span className="text-[11px] font-medium" style={{ color }}>
          {label}
        </span>
      )}
    </span>
  )
}
