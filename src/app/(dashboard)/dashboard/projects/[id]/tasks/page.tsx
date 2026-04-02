import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import TaskBoard from '@/components/tasks/TaskBoard'

export default async function TasksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from('tasks')
      .select(`
        *,
        assignee:users(id, full_name, avatar_url),
        checklist:task_checklist_items(*)
      `)
      .eq('project_id', id)
      .order('position'),
    supabase
      .from('project_members')
      .select('user:users(id, full_name, avatar_url)')
      .eq('project_id', id),
  ])

  const teamMembers = (members || []).map((m) => m.user as unknown as { id: string; full_name: string; avatar_url: string | null })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-[var(--border)]">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft size={15} />
          </Link>
        </Button>
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">{project.name}</p>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Tâches</h1>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-auto p-6">
        <TaskBoard
          projectId={id}
          initialTasks={tasks || []}
          teamMembers={teamMembers}
        />
      </div>
    </div>
  )
}
