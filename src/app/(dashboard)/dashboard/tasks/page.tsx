import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TasksGlobal from '@/components/tasks/TasksGlobal'

export default async function TasksPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [
    { data: tasks },
    { data: teamMembers },
    { data: projects },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select(`
        id, title, status, priority, due_date, project_id, assignee_id, tags,
        project:projects(id, name, code, color),
        assignee:users(id, full_name)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, full_name')
      .in('role', ['ADMIN', 'TEAM'])
      .order('full_name'),
    supabase
      .from('projects')
      .select('id, name, code, color')
      .order('name'),
  ])

  const total = tasks?.length ?? 0

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-[var(--muted-foreground)] tracking-widest uppercase mb-2">
          {total} tâche{total > 1 ? 's' : ''} · toutes colonnes confondues
        </p>
        <h1 className="headline text-[44px] leading-[0.95] uppercase">
          Toutes les&nbsp;<span className="highlight-blue">Tâches</span>
        </h1>
      </div>

      <TasksGlobal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialTasks={(tasks ?? []) as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projects={(projects ?? []) as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        teamMembers={(teamMembers ?? []) as any}
      />
    </div>
  )
}
