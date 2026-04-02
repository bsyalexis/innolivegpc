import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import DeliveryManager from '@/components/deliveries/DeliveryManager'

export default async function ClientDeliveryPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!currentUser || currentUser.role !== 'CLIENT') redirect('/dashboard')

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select(`*, created_by_user:users!deliveries_created_by_fkey(full_name), feedback:delivery_feedback(*, author:users(full_name))`)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Link href="/client">
            <ArrowLeft size={15} />
          </Link>
        </Button>
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">{project.name}</p>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Livraisons</h1>
        </div>
      </div>

      <DeliveryManager
        projectId={projectId}
        currentUser={currentUser}
        initialDeliveries={deliveries || []}
        isTeam={false}
      />
    </div>
  )
}
