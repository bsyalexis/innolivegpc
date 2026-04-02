import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user) {
    redirect('/api/auth/signout')
  }

  if (user.role === 'CLIENT') {
    redirect('/client')
  }

  // Compte non-lus pour le badge sidebar
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', authUser.id)
    .eq('read', false)

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar unreadCount={unreadCount ?? 0} />
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
