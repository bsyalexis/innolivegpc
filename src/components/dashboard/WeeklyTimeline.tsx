'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, CheckSquare, FolderKanban } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { type TaskPriority } from '@/types'
import { cn } from '@/lib/utils'

interface TimelineTask {
  id: string
  title: string
  due_date: string
  priority: TaskPriority
  project_id: string
  project_name: string
}

interface TimelineProject {
  id: string
  name: string
  deadline: string
}

interface Props {
  userId: string
  isAdmin: boolean
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  basse: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  normale: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  haute: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  urgente: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function WeeklyTimeline({ userId, isAdmin }: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [tasks, setTasks] = useState<TimelineTask[]>([])
  const [projects, setProjects] = useState<TimelineProject[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = format(weekStart, 'yyyy-MM-dd')
    const to = format(weekEnd, 'yyyy-MM-dd')

    const tasksQuery = isAdmin
      ? supabase
          .from('tasks')
          .select('id, title, due_date, priority, project_id, project:projects!tasks_project_id_fkey(name)')
          .gte('due_date', from)
          .lte('due_date', to)
          .neq('status', 'termine')
          .order('due_date', { ascending: true })
      : supabase
          .from('tasks')
          .select('id, title, due_date, priority, project_id, project:projects!tasks_project_id_fkey(name)')
          .eq('assignee_id', userId)
          .gte('due_date', from)
          .lte('due_date', to)
          .neq('status', 'termine')
          .order('due_date', { ascending: true })

    const projectsQuery = isAdmin
      ? supabase
          .from('projects')
          .select('id, name, deadline')
          .gte('deadline', from)
          .lte('deadline', to)
          .neq('status', 'archive')
      : supabase
          .from('project_members')
          .select('project:projects!project_members_project_id_fkey(id, name, deadline)')
          .eq('user_id', userId)

    const [{ data: tasksRaw }, { data: projectsRaw }] = await Promise.all([
      tasksQuery,
      projectsQuery,
    ])

    const normalizedTasks: TimelineTask[] = (tasksRaw ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      title: t.title as string,
      due_date: t.due_date as string,
      priority: t.priority as TaskPriority,
      project_id: t.project_id as string,
      project_name: ((t.project as Record<string, unknown>)?.name as string) ?? '',
    }))

    let normalizedProjects: TimelineProject[] = []
    if (isAdmin) {
      normalizedProjects = (projectsRaw ?? [])
        .filter((p: Record<string, unknown>) => p.deadline)
        .map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          deadline: p.deadline as string,
        }))
    } else {
      type MemberRow = { project: { id: string; name: string; deadline: string | null } }
      normalizedProjects = ((projectsRaw ?? []) as unknown as MemberRow[])
        .map((r) => r.project)
        .filter((p) => p.deadline && p.deadline >= from && p.deadline <= to)
        .map((p) => ({
          id: p.id,
          name: p.name,
          deadline: p.deadline as string,
        }))
    }

    setTasks(normalizedTasks)
    setProjects(normalizedProjects)
    setLoading(false)
  }, [weekStart, userId, isAdmin, supabase, weekEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getItemsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayTasks = tasks.filter((t) => t.due_date === dayStr)
    const dayProjects = projects.filter((p) => p.deadline === dayStr)
    return { dayTasks, dayProjects }
  }

  const totalItems = tasks.length + projects.length

  return (
    <Card className="bg-[var(--card)] border-[var(--border)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <CalendarDays size={15} />
              Agenda de la semaine
            </CardTitle>
            {totalItems > 0 && (
              <Badge variant="outline" className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20">
                {totalItems} élément{totalItems > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
              className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-[var(--muted-foreground)] px-1 min-w-[120px] text-center">
              {format(weekStart, 'd MMM', { locale: fr })} – {format(weekEnd, 'd MMM yyyy', { locale: fr })}
            </span>
            <button
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pb-2">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            Chargement…
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-[var(--border)] border-t border-[var(--border)]">
            {days.map((day) => {
              const { dayTasks, dayProjects } = getItemsForDay(day)
              const today = isToday(day)
              const hasItems = dayTasks.length + dayProjects.length > 0

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[120px] p-2 flex flex-col gap-1',
                    today && 'bg-[var(--primary)]/5'
                  )}
                >
                  <div className={cn(
                    'text-center mb-1',
                    today ? 'text-[var(--primary)] font-semibold' : 'text-[var(--muted-foreground)]'
                  )}>
                    <p className="text-[10px] uppercase tracking-wider">
                      {format(day, 'EEE', { locale: fr })}
                    </p>
                    <p className={cn(
                      'text-sm font-bold',
                      today && 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs'
                    )}>
                      {format(day, 'd')}
                    </p>
                  </div>

                  {!hasItems && (
                    <div className="flex-1" />
                  )}

                  {dayProjects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/projects/${p.id}`}
                      className="group flex items-center gap-1 px-1.5 py-1 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors truncate"
                      title={p.name}
                    >
                      <FolderKanban size={9} className="shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </Link>
                  ))}

                  {dayTasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/dashboard/projects/${t.project_id}/tasks`}
                      className={cn(
                        'flex items-center gap-1 px-1.5 py-1 rounded text-[10px] border hover:opacity-80 transition-opacity truncate',
                        PRIORITY_COLORS[t.priority]
                      )}
                      title={`${t.title} — ${t.project_name}`}
                    >
                      <CheckSquare size={9} className="shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
