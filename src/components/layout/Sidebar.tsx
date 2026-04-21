'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  Bell,
  Users,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { type User } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  TEAM: 'Équipe',
  CLIENT: 'Client',
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projets', icon: FolderKanban },
  { href: '/dashboard/clients', label: 'Clients', icon: Users, adminOnly: true },
]

interface SidebarProps {
  user: User
  unreadCount?: number
}

export default function Sidebar({ user, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = user.role === 'ADMIN'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r border-[var(--border)] bg-[var(--sidebar-bg)] px-3 py-5">
      {/* Logo */}
      <div className="px-3 mb-8">
        <span className="text-xl font-bold tracking-tight text-white">
          Innolive
          <span className="text-[var(--primary)]">.</span>
        </span>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Gestion de projets</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--secondary-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === '/dashboard/notifications'
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--secondary-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
          )}
        >
          <Bell size={16} />
          Notifications
          {unreadCount > 0 && (
            <Badge className="ml-auto text-xs h-5 min-w-5 px-1 bg-[var(--destructive)] text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Link>
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-[var(--border)] pt-4">
        {/* User card */}
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--foreground)] truncate">{user.full_name}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === '/dashboard/settings'
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--secondary-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
          )}
        >
          <Settings size={16} />
          Paramètres
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--destructive)] transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
