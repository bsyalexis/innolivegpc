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
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Bell, Plus } from 'lucide-react'

const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  TEAM: 'Équipe',
  CLIENT: 'Client',
}

interface HeaderProps {
  user: User
  title?: string
  subtitle?: string
}

export default function Header({ user, title, subtitle }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="bg-[var(--card)] border border-[var(--border)] rounded-full flex items-center gap-4 px-3 py-2 mb-6"
      style={{ boxShadow: '0 10px 40px rgba(10,10,10,0.06), 0 2px 6px rgba(10,10,10,0.04)' }}
    >
      {/* Title */}
      <div className="flex-1 pl-3">
        {subtitle && (
          <p className="text-[10px] text-[var(--muted-foreground)] tracking-widest uppercase leading-none mb-0.5">
            {subtitle}
          </p>
        )}
        <h1 className="wordmark text-[18px] leading-none text-[var(--foreground)]">
          {title || 'Innolive'}
        </h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--muted)] px-4 py-2 rounded-full min-w-[220px]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted-foreground)] shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="text-[13px] text-[var(--muted-foreground)] flex-1 select-none">
          Rechercher…
        </span>
        <kbd className="text-[10px] text-[var(--muted-foreground)] bg-[var(--card)] px-1.5 py-0.5 rounded font-semibold">
          ⌘K
        </kbd>
      </div>

      {/* Notification bell */}
      <button className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center relative hover:bg-[var(--chip)] transition-colors">
        <Bell size={17} className="text-[var(--foreground)]" />
        <span
          className="absolute top-2 right-2.5 w-2 h-2 rounded-full border-2 border-white"
          style={{ background: 'var(--orange)' }}
        />
      </button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center hover:opacity-80 transition-opacity">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback
                className="text-white text-xs font-bold"
                style={{ background: 'var(--blue)' }}
              >
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-[var(--card)] border-[var(--border)] rounded-2xl shadow-lg">
          <DropdownMenuLabel className="text-[var(--muted-foreground)] text-xs pb-1">
            <div className="font-semibold text-[var(--foreground)] text-sm">{user.full_name}</div>
            <div>{user.email}</div>
            <div className="mt-0.5">{ROLE_LABELS[user.role]}</div>
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

      {/* Nouveau button */}
      <button
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ink)] text-white text-[13px] font-semibold transition-transform hover:-translate-y-px"
        onClick={() => router.push('/dashboard/projects/new')}
      >
        <Plus size={15} />
        Nouveau
      </button>
    </header>
  )
}
