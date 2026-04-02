'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Users } from 'lucide-react'
import MessageThread from './MessageThread'
import { type Message, type User } from '@/types'

interface MessagingTabsProps {
  projectId: string
  currentUser: User
  initialInternal: Message[]
  initialClient: Message[]
}

export default function MessagingTabs({
  projectId,
  currentUser,
  initialInternal,
  initialClient,
}: MessagingTabsProps) {
  return (
    <Tabs defaultValue="internal" className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] px-6 shrink-0">
        <TabsList className="bg-transparent border-0 h-auto p-0 gap-0">
          <TabsTrigger
            value="internal"
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--primary)] text-[var(--muted-foreground)] rounded-none bg-transparent"
          >
            <Lock size={13} />
            Équipe interne
          </TabsTrigger>
          <TabsTrigger
            value="client"
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--primary)] text-[var(--muted-foreground)] rounded-none bg-transparent"
          >
            <Users size={13} />
            Avec le client
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="internal" className="flex-1 overflow-hidden m-0">
        <MessageThread
          projectId={projectId}
          threadType="internal"
          currentUser={currentUser}
          initialMessages={initialInternal}
        />
      </TabsContent>

      <TabsContent value="client" className="flex-1 overflow-hidden m-0">
        <MessageThread
          projectId={projectId}
          threadType="client"
          currentUser={currentUser}
          initialMessages={initialClient}
        />
      </TabsContent>
    </Tabs>
  )
}
