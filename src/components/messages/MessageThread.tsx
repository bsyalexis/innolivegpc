'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Message, type User, type ThreadType } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDateRelative, getInitials } from '@/lib/utils'
import { Send, Paperclip, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface MessageThreadProps {
  projectId: string
  threadType: ThreadType
  currentUser: User
  initialMessages: Message[]
}

export default function MessageThread({
  projectId,
  threadType,
  currentUser,
  initialMessages,
}: MessageThreadProps) {
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [content, setContent] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [driveFilename, setDriveFilename] = useState('')
  const [showAttach, setShowAttach] = useState(false)
  const [sending, setSending] = useState(false)

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${projectId}:${threadType}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          if (payload.new.thread_type !== threadType) return
          // Fetch full message with author
          const { data } = await supabase
            .from('messages')
            .select(`*, author:users(id, full_name, avatar_url), attachments:message_attachments(*)`)
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages((prev) => [...prev, data as Message])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, projectId, threadType])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!content.trim() && !driveUrl.trim()) return
    setSending(true)

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        author_id: currentUser.id,
        content: content.trim() || '(pièce jointe)',
        thread_type: threadType,
      })
      .select()
      .single()

    if (error || !message) {
      toast.error('Impossible d\'envoyer le message')
      setSending(false)
      return
    }

    // Ajouter la pièce jointe Drive si présente
    if (driveUrl.trim() && driveFilename.trim()) {
      await supabase.from('message_attachments').insert({
        message_id: message.id,
        filename: driveFilename.trim(),
        drive_url: driveUrl.trim(),
      })
    }

    setContent('')
    setDriveUrl('')
    setDriveFilename('')
    setShowAttach(false)
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOwn = (msg: Message) => msg.author_id === currentUser.id

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--muted-foreground)]">
              Aucun message pour l&apos;instant. Lancez la conversation.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const own = isOwn(msg)
          const author = msg.author as { full_name: string; avatar_url?: string } | undefined

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${own ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={author?.avatar_url || undefined} />
                <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-bold">
                  {getInitials(author?.full_name || '?')}
                </AvatarFallback>
              </Avatar>

              <div className={`max-w-[70%] space-y-1 ${own ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`flex items-center gap-2 ${own ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {own ? 'Vous' : author?.full_name}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {formatDateRelative(msg.created_at)}
                  </span>
                </div>

                <div
                  className={`rounded-xl px-3 py-2 text-sm ${
                    own
                      ? 'bg-[var(--primary)] text-white rounded-tr-none'
                      : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-none'
                  }`}
                >
                  {msg.content !== '(pièce jointe)' && (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}

                  {/* Pièces jointes */}
                  {msg.attachments?.map((att) => (
                    <a
                      key={att.id}
                      href={att.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 text-xs mt-1.5 underline ${
                        own ? 'text-white/80 hover:text-white' : 'text-[var(--primary)] hover:opacity-80'
                      }`}
                    >
                      <Paperclip size={11} />
                      {att.filename}
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input zone */}
      <div className="border-t border-[var(--border)] p-4 space-y-2 shrink-0">
        {showAttach && (
          <div className="flex gap-2">
            <input
              value={driveFilename}
              onChange={(e) => setDriveFilename(e.target.value)}
              placeholder="Nom du fichier"
              className="flex-1 text-xs bg-[var(--input)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            <input
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="Lien Google Drive"
              className="flex-[2] text-xs bg-[var(--input)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message... (Ctrl+Entrée pour envoyer)"
            rows={2}
            className="flex-1 bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none text-sm"
          />
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAttach(!showAttach)}
              className={`h-8 w-8 p-0 ${showAttach ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
              title="Joindre un fichier Drive"
            >
              <Paperclip size={15} />
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || (!content.trim() && !driveUrl.trim())}
              className="h-8 w-8 p-0 bg-[var(--primary)] hover:bg-indigo-500 text-white"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
