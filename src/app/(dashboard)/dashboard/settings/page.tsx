import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type User } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileSettings from '@/components/settings/ProfileSettings'
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

  if (!currentUser) redirect('/api/auth/signout')

  const isAdmin = currentUser.role === 'ADMIN'

  let allUsers: User[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })
    allUsers = (data as User[]) ?? []
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Paramètres</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Gérez votre profil et vos préférences.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-[var(--muted)] border border-[var(--border)]">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--foreground)] text-[var(--muted-foreground)]"
          >
            Profil
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="team"
              className="data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--foreground)] text-[var(--muted-foreground)]"
            >
              Équipe
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings user={currentUser as User} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team" className="mt-6">
            <div className="max-w-3xl">
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Gérez les membres de l&apos;équipe (ADMIN et TEAM). Pour les clients, utilisez la page{' '}
                <a href="/dashboard/clients" className="text-[var(--primary)] hover:underline">
                  Clients
                </a>.
              </p>
              <UserManager users={allUsers.filter((u) => u.role !== 'CLIENT')} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
