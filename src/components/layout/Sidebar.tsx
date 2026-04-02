'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projets', icon: FolderKanban },
]

interface SidebarProps {
  unreadCount?: number
}

export default function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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
        {navItems.map(({ href, label, icon: Icon }) => {
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
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-[var(--secondary-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
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
