"use client"

import { memo, useState, useEffect } from "react"
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
  CalendarDays,
  ListTodo,
  Shapes,
  ChevronRight,
  LibraryBig,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isFeatureAvailable, type FeatureKey } from "@/lib/features.config"
import { Separator } from "@ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ui/accordion"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/popover"

// 네비게이션 아이템 타입
interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  subItems?: NavItem[]
  featureFlag?: FeatureKey  // 피처 플래그 (undefined면 항상 표시)
}

interface NavGroup {
  title: string
  items: NavItem[]
}

// 네비게이션 그룹 구조 (계층적)
const navigationGroups: NavGroup[] = [
  {
    title: "메인",
    items: [
      { name: "대시보드", href: "/dashboard", icon: LayoutDashboard, featureFlag: "dashboard" },
      { name: "학원 캘린더", href: "/calendar", icon: CalendarDays, featureFlag: "calendarIntegration" },
    ]
  },
  {
    title: "학생 관리",
    items: [
      {
        name: "학생 관리",
        href: "/students",
        icon: Users,
        featureFlag: "studentManagement",
        subItems: [
          { name: "전체 학생", href: "/students", icon: Users, featureFlag: "studentManagement" },
          { name: "보호자 관리", href: "/guardians", icon: UserCircle, featureFlag: "guardianManagement" },
        ]
      },
      { name: "출석 관리", href: "/attendance", icon: Calendar, featureFlag: "attendanceManagement" },
    ]
  },
  {
    title: "학습 관리",
    items: [
      { name: "수업 관리", href: "/classes", icon: GraduationCap, featureFlag: "classManagement" },
      {
        name: "성적 관리",
        href: "/grades",
        icon: FileText,
        featureFlag: "gradesManagement",
        subItems: [
          { name: "성적 입력", href: "/grades", icon: FileText, featureFlag: "gradesManagement" },
          { name: "시험 관리", href: "/grades/exams", icon: ClipboardCheck, featureFlag: "gradesManagement" },
        ]
      },
      {
        name: "TODO 관리",
        href: "/todos",
        icon: ClipboardCheck,
        featureFlag: "todoManagement",
        subItems: [
          { name: "과제 목록", href: "/todos", icon: ListTodo, featureFlag: "todoManagement" },
          { name: "템플릿 관리", href: "/todos/templates", icon: LibraryBig, featureFlag: "todoManagement" },
        ]
      },
      { name: "교재 관리", href: "/library", icon: BookOpen, featureFlag: "libraryManagement" },
    ]
  },
  {
    title: "운영",
    items: [
      { name: "학원비 관리", href: "/payments", icon: CreditCard, featureFlag: "tuitionManagement" },
      { name: "월간 리포트", href: "/reports", icon: BarChart3, featureFlag: "reportManagement" },
      { name: "상담 관리", href: "/consultations", icon: MessageSquare, featureFlag: "consultationManagement" },
      { name: "직원 관리", href: "/staff", icon: Briefcase, featureFlag: "staffManagement" },
      { name: "메시지 전송", href: "/notifications", icon: Send, featureFlag: "notificationSystem" },
    ]
  },
  {
    title: "시스템",
    items: [
      {
        name: "설정",
        href: "/settings",
        icon: Settings,
        subItems: [
          { name: "일반 설정", href: "/settings", icon: Settings },
          { name: "과목 관리", href: "/settings/subjects", icon: Shapes, featureFlag: "subjectManagement" },
        ]
      },
    ]
  }
]

/**
 * 피처 플래그에 따라 네비게이션 아이템 필터링
 */
function filterNavItemsByFeatureFlags(item: NavItem): boolean {
  // featureFlag가 없으면 항상 표시
  if (!item.featureFlag) return true

  // featureFlag가 있으면 해당 기능이 사용 가능한지 확인 (active 또는 beta)
  return isFeatureAvailable(item.featureFlag)
}

/**
 * 네비게이션 그룹 필터링 (재귀적으로 subItems도 필터링)
 */
function getFilteredNavigationGroups(): NavGroup[] {
  return navigationGroups
    .map(group => ({
      ...group,
      items: group.items
        .filter(filterNavItemsByFeatureFlags)
        .map(item => ({
          ...item,
          // subItems도 필터링
          subItems: item.subItems?.filter(filterNavItemsByFeatureFlags)
        }))
    }))
    // items가 비어있는 그룹은 제거
    .filter(group => group.items.length > 0)
}

interface AppNavProps {
  isCollapsed?: boolean
  onNavigate?: () => void
}

/**
 * 단순 메뉴 아이템 컴포넌트
 * - 역할: 메뉴 아이템의 시각적 표현만 담당
 * - 링크, 아이콘, 텍스트, Active 상태 표시
 * - 어떤 구조(Accordion, Popover 등)에도 사용 가능
 */
function SimpleNavItem({
  item,
  isCollapsed = false,
  depth = 0,
  onClick,
}: {
  item: NavItem
  isCollapsed?: boolean
  depth?: number
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === item.href
  const Icon = item.icon

  return (
    <Link href={item.href} onClick={onClick}>
      <div
        className={cn(
          "relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
          "hover:scale-[1.02] active:scale-[0.98]",
          depth > 0 && !isCollapsed && "ml-2"
        )}
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />

        {!isCollapsed && (
          <motion.span
            className="whitespace-nowrap"
            initial={{ opacity: 1, width: 'auto' }}
            animate={{
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto',
              x: isCollapsed ? -10 : 0,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {item.name}
          </motion.span>
        )}

        {/* Active Indicator - 통일된 layoutId */}
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
}

/**
 * 축소 상태 - Popover로 하위 메뉴 표시
 */
function CollapsedMenuWithSubItems({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const hasSubItems = item.subItems && item.subItems.length > 0
  const isChildActive = hasSubItems && (item.subItems?.some(sub => pathname === sub.href) ?? false)
  const Icon = item.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "relative flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
            isChildActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            "px-2 py-2",
            "hover:scale-[1.02] active:scale-[0.98]"
          )}
          title={item.name}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
        </div>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-48 p-2">
        <div className="space-y-0.5">
          {item.subItems?.map((subItem) => (
            <SimpleNavItem
              key={subItem.href}
              item={subItem}
              isCollapsed={false}
              onClick={() => {
                setOpen(false)
                onNavigate?.()
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const AppNav = memo(function AppNav({ isCollapsed = false, onNavigate }: AppNavProps) {
  const pathname = usePathname()

  // 전체 아이템 중 현재 활성화된 아이템 찾기 (Accordion 자동 열림용)
  const findActiveItemValue = (): string | undefined => {
    const filteredGroups = getFilteredNavigationGroups()
    for (const group of filteredGroups) {
      for (const item of group.items) {
        if (item.subItems) {
          const isChildActive = item.subItems.some(sub => pathname.startsWith(sub.href))
          if (isChildActive) return item.href
        }
      }
    }
    return undefined
  }

  const activeValue = findActiveItemValue()

  // Accordion 상태를 관리 (controlled mode)
  const [openItems, setOpenItems] = useState<string[]>(() => {
    return activeValue ? [activeValue] : []
  })

  // pathname이 변경되면 해당 메뉴를 열기 (페이지 이동 시)
  useEffect(() => {
    if (activeValue && !openItems.includes(activeValue)) {
      setOpenItems(prev => [...prev, activeValue])
    }
  }, [pathname, activeValue, openItems])

  return (
    <nav className={cn(
      "flex h-full flex-col gap-2 overflow-y-auto transition-all duration-300",
      isCollapsed ? "p-2" : "p-4"
    )}>
      {!isCollapsed ? (
        // 펼침 상태: 전체를 하나의 Accordion으로 감싸기
        <Accordion
          type="multiple"
          value={openItems}
          onValueChange={setOpenItems}
        >
          {getFilteredNavigationGroups().map((group, groupIndex) => {
            const itemsWithoutSubMenus = group.items.filter(item => !item.subItems || item.subItems.length === 0)
            const itemsWithSubMenus = group.items.filter(item => item.subItems && item.subItems.length > 0)

            return (
              <div key={group.title} className="space-y-1">
                {/* 그룹 제목 */}
                <motion.div
                  className="overflow-hidden"
                  animate={{
                    height: 'auto',
                    opacity: 1,
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {group.title}
                  </h3>
                </motion.div>

                {/* 하위 메뉴가 없는 아이템들 */}
                {itemsWithoutSubMenus.map((item) => (
                  <SimpleNavItem
                    key={item.href}
                    item={item}
                    isCollapsed={false}
                    onClick={onNavigate}
                  />
                ))}

                {/* 하위 메뉴가 있는 아이템들 - AccordionItem으로 */}
                {itemsWithSubMenus.map((item) => (
                  <AccordionItem
                    key={item.href}
                    value={item.href}
                    className="border-none"
                  >
                    <AccordionTrigger className="py-0 px-0 hover:no-underline [&>svg]:hidden [&[data-state=open]_.chevron-icon]:rotate-90">
                      <div className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{item.name}</span>
                        </div>
                        <ChevronRight className="chevron-icon h-4 w-4 flex-shrink-0 transition-transform duration-200" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0 pt-1">
                      <div className="space-y-0.5 pl-4">
                        {item.subItems?.map((subItem) => (
                          <SimpleNavItem
                            key={subItem.href}
                            item={subItem}
                            depth={1}
                            onClick={onNavigate}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}

                {/* 그룹 간 구분선 */}
                {groupIndex < getFilteredNavigationGroups().length - 1 && (
                  <Separator className="transition-all duration-300 my-2" />
                )}
              </div>
            )
          })}
        </Accordion>
      ) : (
        // 축소 상태: Accordion 없이 렌더링
        getFilteredNavigationGroups().map((group, groupIndex) => {
          const itemsWithoutSubMenus = group.items.filter(item => !item.subItems || item.subItems.length === 0)
          const itemsWithSubMenus = group.items.filter(item => item.subItems && item.subItems.length > 0)

          return (
            <div key={group.title} className="space-y-0.5">
              {/* 그룹 제목 (축소 시 숨김) */}
              <motion.div
                className="overflow-hidden"
                animate={{
                  height: 0,
                  opacity: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {group.title}
                </h3>
              </motion.div>

              {/* 하위 메뉴가 없는 아이템들 */}
              {itemsWithoutSubMenus.map((item) => (
                <SimpleNavItem
                  key={item.href}
                  item={item}
                  isCollapsed={true}
                  onClick={onNavigate}
                />
              ))}

              {/* 하위 메뉴가 있는 아이템들 - Popover 사용 */}
              {itemsWithSubMenus.map((item) => (
                <CollapsedMenuWithSubItems key={item.href} item={item} onNavigate={onNavigate} />
              ))}

              {/* 그룹 간 구분선 */}
              {groupIndex < getFilteredNavigationGroups().length - 1 && (
                <Separator className="transition-all duration-300 my-1" />
              )}
            </div>
          )
        })
      )}
    </nav>
  )
})
