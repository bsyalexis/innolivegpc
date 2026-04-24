'use client'

import { type User } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Home, FileText, Receipt, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClientNavProps {
  user: User
  unreadCount?: number
}

const NAV_LINKS = [
  { href: '/client', label: 'Mes projets', icon: Home, exact: true },
  { href: '/client/documents', label: 'Documents', icon: FileText, exact: false },
  { href: '/client/factures', label: 'Factures', icon: Receipt, exact: false },
]

export default function ClientNav({ user, unreadCount = 0 }: ClientNavProps) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--sidebar-bg)] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/client" className="shrink-0">
          <span className="text-lg font-bold text-white">
            Innolive<span className="text-[var(--primary)]">.</span>
          </span>
          <span className="text-xs font-normal text-[var(--muted-foreground)] ml-2 hidden sm:inline">
            Espace client
          </span>
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isActive(href, exact)
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
              )}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>

        {/* User section */}
        <div className="flex items-center gap-3 shrink-0">
          {unreadCount > 0 && (
            <div className="relative">
              <Bell size={15} className="text-[var(--muted-foreground)]" />
              <span className="absolute -top-1 -right-1 bg-[var(--primary)] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </div>
          )}
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-[var(--foreground)] hidden md:block">
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
