"use client"

import { memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  ClipboardCheck,
  UserCircle,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Bell,
  Briefcase,
  CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

// 네비게이션 그룹 구조
const navigationGroups = [
  {
    title: "메인",
    items: [
      { name: "대시보드", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "학생 관리",
    items: [
      { name: "학생 관리", href: "/students", icon: Users },
      { name: "보호자 관리", href: "/guardians", icon: UserCircle },
      { name: "출석 관리", href: "/attendance", icon: Calendar },
    ]
  },
  {
    title: "학습 관리",
    items: [
      { name: "수업 관리", href: "/classes", icon: GraduationCap },
      { name: "성적 입력", href: "/grades", icon: FileText },
      { name: "TODO 관리", href: "/todos", icon: ClipboardCheck },
      { name: "교재 관리", href: "/library", icon: BookOpen },
    ]
  },
  {
    title: "운영",
    items: [
      { name: "학원비 관리", href: "/payments", icon: CreditCard },
      { name: "월간 리포트", href: "/reports", icon: BarChart3 },
      { name: "상담 관리", href: "/consultations", icon: MessageSquare },
      { name: "직원 관리", href: "/staff", icon: Briefcase },
      { name: "알림", href: "/notifications", icon: Bell },
    ]
  },
  {
    title: "시스템",
    items: [
      { name: "설정", href: "/settings", icon: Settings },
    ]
  }
]

interface AppNavProps {
  isCollapsed?: boolean
}

export const AppNav = memo(function AppNav({ isCollapsed = false }: AppNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn(
      "flex h-full flex-col gap-2 overflow-y-auto transition-all duration-300",
      isCollapsed ? "p-2" : "p-4"
    )}>
      {navigationGroups.map((group, groupIndex) => (
        <div key={group.title} className={cn(
          isCollapsed ? "space-y-0.5" : "space-y-1"
        )}>
          {/* 그룹 제목 */}
          <motion.div
            className="overflow-hidden"
            animate={{
              height: isCollapsed ? 0 : 'auto',
              opacity: isCollapsed ? 0 : 1,
              paddingTop: isCollapsed ? 0 : '0.5rem',
              paddingBottom: isCollapsed ? 0 : '0.5rem',
            }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              {group.title}
            </h3>
          </motion.div>

          {/* 그룹 아이템들 */}
          {group.items.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                    "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />

                  <motion.span
                    className="whitespace-nowrap"
                    animate={{
                      opacity: isCollapsed ? 0 : 1,
                      width: isCollapsed ? 0 : 'auto',
                      x: isCollapsed ? -10 : 0,
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {item.name}
                  </motion.span>

                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg bg-primary"
                      layoutId="activeNav"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                </div>
              </Link>
            )
          })}

          {/* 그룹 간 구분선 */}
          {groupIndex < navigationGroups.length - 1 && (
            <Separator className={cn(
              "transition-all duration-300",
              isCollapsed ? "my-1" : "my-2"
            )} />
          )}
        </div>
      ))}
    </nav>
  )
})
