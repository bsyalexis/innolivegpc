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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ClientNav user={user} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
