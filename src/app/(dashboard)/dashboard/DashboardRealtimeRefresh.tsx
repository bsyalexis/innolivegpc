'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

export default function DashboardRealtimeRefresh({ userId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${userId}` },
        () => startTransition(() => router.refresh())
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members', filter: `user_id=eq.${userId}` },
        () => startTransition(() => router.refresh())
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        () => startTransition(() => router.refresh())
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        () => startTransition(() => router.refresh())
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId, router])

  return null
}
