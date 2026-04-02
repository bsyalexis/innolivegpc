'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Task, type TaskStatus, TASK_STATUS_LABELS } from '@/types'
import TaskCard from './TaskCard'
import TaskDialog from './TaskDialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

const COLUMNS: TaskStatus[] = ['a_faire', 'en_cours', 'bloque', 'termine']

const COLUMN_COLORS: Record<TaskStatus, string> = {
  a_faire: 'border-zinc-500/30',
  en_cours: 'border-blue-500/30',
  bloque: 'border-red-500/30',
  termine: 'border-green-500/30',
}

const COLUMN_HEADER_COLORS: Record<TaskStatus, string> = {
  a_faire: 'text-zinc-400',
  en_cours: 'text-blue-400',
  bloque: 'text-red-400',
  termine: 'text-green-400',
}

interface TeamMember {
  id: string
  full_name: string
  avatar_url: string | null
}

interface TaskBoardProps {
  projectId: string
  initialTasks: Task[]
  teamMembers: TeamMember[]
}

export default function TaskBoard({ projectId, initialTasks, teamMembers }: TaskBoardProps) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('a_faire')

  function getColumnTasks(status: TaskStatus) {
    return tasks.filter((t) => t.status === status)
  }

  async function handleMoveTask(taskId: string, newStatus: TaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
    if (error) {
      toast.error('Impossible de déplacer la tâche')
      setTasks(initialTasks)
    }
  }

  async function handleDeleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    await supabase.from('tasks').delete().eq('id', taskId)
    toast.success('Tâche supprimée')
  }

  function handleEditTask(task: Task) {
    setEditingTask(task)
    setDialogOpen(true)
  }

  function handleAddTask(status: TaskStatus) {
    setEditingTask(null)
    setDefaultStatus(status)
    setDialogOpen(true)
  }

  async function handleSaveTask(taskData: Partial<Task>) {
    if (editingTask) {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id)
        .select(`*, assignee:users(id, full_name, avatar_url), checklist:task_checklist_items(*)`)
        .single()
      if (!error && data) {
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? data : t)))
        toast.success('Tâche mise à jour')
      }
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          project_id: projectId,
          position: getColumnTasks(taskData.status as TaskStatus).length,
        })
        .select(`*, assignee:users(id, full_name, avatar_url), checklist:task_checklist_items(*)`)
        .single()
      if (!error && data) {
        setTasks((prev) => [...prev, data])
        toast.success('Tâche créée')
      }
    }
    setDialogOpen(false)
    setEditingTask(null)
  }

  return (
    <>
      <div className="flex gap-4 min-w-max">
        {COLUMNS.map((status) => {
          const columnTasks = getColumnTasks(status)
          return (
            <div key={status} className="flex flex-col w-72 shrink-0">
              {/* Column header */}
              <div className={`flex items-center justify-between mb-3 pb-2 border-b ${COLUMN_COLORS[status]}`}>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${COLUMN_HEADER_COLORS[status]}`}>
                    {TASK_STATUS_LABELS[status]}
                  </h3>
                  <span className="text-xs bg-[var(--muted)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddTask(status)}
                  className="h-6 w-6 p-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <Plus size={13} />
                </Button>
              </div>

              {/* Tasks */}
              <div className="space-y-2 min-h-[200px]">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => handleEditTask(task)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onMove={(newStatus) => handleMoveTask(task.id, newStatus)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(null) }}
        onSave={handleSaveTask}
        task={editingTask}
        defaultStatus={defaultStatus}
        teamMembers={teamMembers}
        projectId={projectId}
      />
    </>
  )
}
