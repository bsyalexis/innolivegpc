'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Settings2 } from 'lucide-react'
import ClientEditDrawer from './ClientEditDrawer'
import { type User } from '@/types'

interface Props {
  client: User
}

export default function ClientDetailActions({ client }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] gap-1.5"
      >
        <Settings2 size={13} />
        Modifier le client
      </Button>

      <ClientEditDrawer
        open={open}
        onOpenChange={setOpen}
        clientId={client.id}
      />
    </>
  )
}
