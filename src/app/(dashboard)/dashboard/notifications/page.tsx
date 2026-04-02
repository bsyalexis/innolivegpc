import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationList from '@/components/notifications/NotificationList'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Marque tout comme lu
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', authUser.id)
    .eq('read', false)

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Notifications</h1>
      <NotificationList notifications={notifications || []} />
    </div>
  )
}
