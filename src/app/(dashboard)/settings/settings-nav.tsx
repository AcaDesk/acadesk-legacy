'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Building2,
  Shapes,
  MessageSquare,
  FileText,
  Settings,
  MonitorPlay,
} from 'lucide-react'

const navItems = [
  {
    title: '일반',
    href: '/settings',
    icon: Settings,
  },
  {
    title: '학원 정보',
    href: '/settings/academy',
    icon: Building2,
  },
  {
    title: '과목 관리',
    href: '/settings/subjects',
    icon: Shapes,
  },
  {
    title: '알림 서비스 연동',
    href: '/settings/messaging-integration',
    icon: MessageSquare,
  },
  {
    title: '메시지 템플릿',
    href: '/settings/message-templates',
    icon: FileText,
  },
  {
    title: '키오스크',
    href: '/settings/kiosk',
    icon: MonitorPlay,
  },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="settings-nav-active"
                className="absolute inset-0 rounded-md bg-accent"
                transition={{ type: 'tween', ease: 'easeOut', duration: 0.18 }}
              />
            )}
            <Icon className="relative h-4 w-4 shrink-0" />
            <span className="relative truncate">{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
