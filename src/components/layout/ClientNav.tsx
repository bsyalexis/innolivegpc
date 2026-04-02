'use client'

import { type User } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface ClientNavProps {
  user: User
}

export default function ClientNav({ user }: ClientNavProps) {
  const supabase = createClient()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="text-lg font-bold text-white">
          Innolive<span className="text-[var(--primary)]">.</span>
          <span className="text-xs font-normal text-[var(--muted-foreground)] ml-2">
            Espace client
          </span>
        </span>

        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-[var(--foreground)] hidden sm:block">
            {user.full_name}
          </span>
          <button
            onClick={handleSignOut}
            className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
            title="Déconnexion"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  )
}
