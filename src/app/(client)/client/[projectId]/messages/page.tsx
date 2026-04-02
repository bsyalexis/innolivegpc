import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import MessageThread from '@/components/messages/MessageThread'

export default async function ClientMessagesPage({
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

  // Vérifie l'accès au projet
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select(`*, author:users(id, full_name, avatar_url), attachments:message_attachments(*)`)
    .eq('project_id', projectId)
    .eq('thread_type', 'client')
    .order('created_at')

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 64px)' }}>
      <div className="flex items-center gap-3 mb-4 shrink-0">
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
          <h1 className="text-lg font-bold text-[var(--foreground)]">Messages</h1>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <MessageThread
          projectId={projectId}
          threadType="client"
          currentUser={currentUser}
          initialMessages={messages || []}
        />
      </div>
    </div>
  )
}
