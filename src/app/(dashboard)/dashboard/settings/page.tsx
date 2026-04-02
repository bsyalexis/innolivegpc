import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserManager from '@/components/settings/UserManager'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!currentUser || currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('role')
    .order('full_name')

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Paramètres</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Gestion des utilisateurs — accès ADMIN uniquement
        </p>
      </div>

      <UserManager users={users || []} />
    </div>
  )
}
