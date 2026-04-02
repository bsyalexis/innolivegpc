'use client'

import { User } from '@/types'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  TEAM: 'Équipe',
  CLIENT: 'Client',
}

interface HeaderProps {
  user: User
  title?: string
}

export default function Header({ user, title }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between px-6">
      <h1 className="text-sm font-semibold text-[var(--foreground)] truncate">
        {title || 'Dashboard'}
      </h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-[var(--primary)] text-white text-xs font-semibold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-[var(--foreground)] leading-tight">
                {user.full_name}
              </p>
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1 border-[var(--border)] text-[var(--muted-foreground)]"
              >
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-[var(--card)] border-[var(--border)]">
          <DropdownMenuLabel className="text-[var(--muted-foreground)] text-xs">
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-[var(--destructive)] cursor-pointer focus:text-[var(--destructive)]"
          >
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
