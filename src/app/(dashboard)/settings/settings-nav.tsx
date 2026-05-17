'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  Building2,
  Shapes,
  MessageSquare,
  FileText,
  Settings,
  MonitorPlay,
  type LucideIcon,
} from 'lucide-react'

interface NavChild {
  title: string
  href: string
}

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  children?: NavChild[]
}

const navItems: NavItem[] = [
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
    children: [
      { title: 'API 설정', href: '/settings/messaging-integration' },
      { title: '카카오 채널·템플릿', href: '/settings/messaging-integration/kakao' },
      { title: '이벤트 알림', href: '/settings/messaging-integration/events' },
    ],
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
        const isExactActive = pathname === item.href
        const hasChildren = !!item.children
        // section 매칭은 자식이 있는 항목에 한해서만 (그 외엔 false-positive 방지)
        const isWithinSection =
          hasChildren && (isExactActive || pathname.startsWith(item.href + '/'))
        const showChildren = hasChildren && isWithinSection
        // 자식이 있는 항목은 자식 라우트가 active 면 부모 highlight 는 약하게.
        const isActive =
          isExactActive && (!hasChildren || !pathname.startsWith(item.href + '/'))

        return (
          <div key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-accent-foreground'
                  : isWithinSection
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
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

            {showChildren && item.children && (
              <ul className="mt-0.5 ml-5 border-l border-border/60 pl-2 space-y-0.5">
                {item.children.map((child) => {
                  const isChildActive = pathname === child.href
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={cn(
                          'block rounded-md px-2.5 py-1.5 text-xs transition-colors',
                          isChildActive
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                        )}
                      >
                        {child.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
