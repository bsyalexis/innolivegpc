import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import ProjectEditForm from '@/components/projects/ProjectEditForm'
import { type User, type Project } from '@/types'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser || currentUser.role === 'CLIENT') redirect('/dashboard')

  const isAdmin = currentUser.role === 'ADMIN'

  const [{ data: project }, { data: users }, { data: members }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('users').select('*').order('full_name'),
    supabase.from('project_members').select('user_id').eq('project_id', id),
  ])

  if (!project) notFound()

  const clients = (users ?? []).filter((u) => u.role === 'CLIENT') as User[]
  const teamMembers = (users ?? []).filter((u) => u.role !== 'CLIENT') as User[]
  const currentMemberIds = (members ?? []).map((m) => m.user_id)

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft size={15} className="mr-1" />
            Retour
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Modifier le projet</h1>

      <ProjectEditForm
        project={project as Project}
        clients={clients}
        teamMembers={teamMembers}
        currentMemberIds={currentMemberIds}
        canDelete={isAdmin}
      />
    </div>
  )
}
