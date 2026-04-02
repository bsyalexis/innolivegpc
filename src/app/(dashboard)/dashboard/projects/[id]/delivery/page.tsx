import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import DeliveryManager from '@/components/deliveries/DeliveryManager'

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, client_id')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select(`*, created_by_user:users!deliveries_created_by_fkey(full_name), feedback:delivery_feedback(*, author:users(full_name))`)
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] shrink-0">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft size={15} />
          </Link>
        </Button>
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">{project.name}</p>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Livraisons</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <DeliveryManager
          projectId={id}
          currentUser={currentUser!}
          initialDeliveries={deliveries || []}
          isTeam={true}
        />
      </div>
    </div>
  )
}
