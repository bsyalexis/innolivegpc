import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import ClientNav from '@/components/layout/ClientNav'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user || user.role !== 'CLIENT') {
    redirect('/dashboard')
  }

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', authUser.id)
    .eq('read', false)

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ClientNav user={user} unreadCount={unreadCount ?? 0} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
