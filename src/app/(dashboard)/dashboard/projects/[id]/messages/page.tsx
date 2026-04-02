import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import MessagingTabs from '@/components/messages/MessagingTabs'

export default async function MessagesPage({
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
    .select('id, name')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const [{ data: internalMessages }, { data: clientMessages }] = await Promise.all([
    supabase
      .from('messages')
      .select(`*, author:users(id, full_name, avatar_url), attachments:message_attachments(*)`)
      .eq('project_id', id)
      .eq('thread_type', 'internal')
      .order('created_at'),
    supabase
      .from('messages')
      .select(`*, author:users(id, full_name, avatar_url), attachments:message_attachments(*)`)
      .eq('project_id', id)
      .eq('thread_type', 'client')
      .order('created_at'),
  ])

  return (
    <div className="flex flex-col h-screen">
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
          <h1 className="text-lg font-bold text-[var(--foreground)]">Messagerie</h1>
        </div>
      </div>

      {/* Messaging */}
      <div className="flex-1 overflow-hidden">
        <MessagingTabs
          projectId={id}
          currentUser={currentUser!}
          initialInternal={internalMessages || []}
          initialClient={clientMessages || []}
        />
      </div>
    </div>
  )
}
