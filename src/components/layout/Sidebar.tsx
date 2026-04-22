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
  Plus,
  Calendar,
  ListTodo,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
  badge?: number | null
}

interface SidebarProps {
  user: User
  unreadCount?: number
}

export default function Sidebar({ user, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = user.role === 'ADMIN'

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/dashboard/projects', label: 'Projets', icon: FolderKanban },
    { href: '/dashboard/tasks', label: 'Tâches', icon: ListTodo },
    { href: '/dashboard/clients', label: 'Clients', icon: Users, adminOnly: true },
    { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: unreadCount || null },
    { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[var(--sidebar-bg)] border-r border-[var(--border)] px-4 py-5">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-6">
        <span className="logo-mark" />
        <div>
          <div className="wordmark text-[17px] leading-none text-[var(--foreground)]">
            INNOLIVE<span style={{ color: 'var(--blue)' }}>.</span>
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] tracking-widest uppercase mt-0.5">
            Projects
          </div>
        </div>
      </div>

      {/* Nouveau projet */}
      <Link
        href="/dashboard/projects/new"
        className="flex items-center justify-between w-full mb-5 px-4 py-3 rounded-full bg-[var(--ink)] text-white text-[13px] font-semibold transition-transform hover:-translate-y-px"
      >
        <span className="flex items-center gap-2">
          <Plus size={15} />
          Nouveau projet
        </span>
        <span className="text-[10px] font-bold tracking-wider bg-[var(--blue)] px-2 py-0.5 rounded-full">
          ⌘N
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map(({ href, label, icon: Icon, badge }) => {
            const isActive = href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--ink)] text-white'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                )}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {badge != null && badge > 0 && (
                  <span className="text-[11px] font-bold bg-[var(--orange)] text-white px-2 py-0.5 rounded-full">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}

        {/* Calendrier */}
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-[var(--muted-foreground)] cursor-not-allowed opacity-60">
          <Calendar size={17} />
          <span className="flex-1">Calendrier</span>
          <span className="text-[11px] bg-[var(--chip)] text-[var(--muted-foreground)] px-2 py-0.5 rounded-full">
            bientôt
          </span>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-0.5">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--destructive)] transition-colors"
        >
          <LogOut size={17} />
          Déconnexion
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback
              className="text-white text-xs font-bold"
              style={{ background: 'var(--blue)' }}
            >
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--foreground)] truncate leading-tight">
              {user.full_name}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Innolive · {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
