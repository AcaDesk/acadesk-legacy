"use client"

import { useState, memo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, User, Settings, LogOut, Menu, Loader2 } from "lucide-react"
import { AppNav } from "@/components/layout/app-nav"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { HelpMenu } from "@/components/layout/help-menu"
import { NotificationPopover } from "@/components/layout/notification-popover"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useLogout } from "@/hooks/use-logout"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * 사이드바 내용 컴포넌트 (데스크톱/모바일 공통)
 */
const SidebarContent = memo(function SidebarContent({
  isCollapsed = false,
  onNavigate,
}: {
  isCollapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* 로고 */}
      <div className="flex h-16 items-center border-b px-6">
        <motion.div
          animate={{
            opacity: isCollapsed ? 0 : 1,
            x: isCollapsed ? -20 : 0
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="whitespace-nowrap"
        >
          <h1 className="text-xl font-bold">Acadesk</h1>
        </motion.div>
      </div>

      {/* 네비게이션 */}
      <div className="flex-1 overflow-y-auto">
        <AppNav isCollapsed={isCollapsed} onNavigate={onNavigate} />
      </div>
    </div>
  )
})

/**
 * 데스크톱 사이드바 (접기/펼치기 기능)
 */
const DesktopSidebar = memo(function DesktopSidebar({
  isCollapsed
}: {
  isCollapsed: boolean
}) {
  return (
    <aside
      className="relative h-full border-r bg-card overflow-hidden"
      style={{ width: isCollapsed ? "4rem" : "16rem" }}
    >
      <SidebarContent isCollapsed={isCollapsed} />
    </aside>
  )
})

/**
 * 헤더 컴포넌트
 */
const Header = memo(function Header({
  onMenuClick,
  showMenuButton = false,
  onLogout,
  isLoggingOut = false,
}: {
  onMenuClick?: () => void
  showMenuButton?: boolean
  onLogout?: () => void
  isLoggingOut?: boolean
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      {/* 모바일: 햄버거 메뉴 + 로고 */}
      <div className="flex items-center gap-4 md:hidden">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-bold">Acadesk</h1>
      </div>

      {/* 우측 액션 영역: 도움말 + 알림 + 테마 + 사용자 메뉴 */}
      <div className="ml-auto flex items-center gap-2">
        {/* 도움말 */}
        <HelpMenu />

        {/* 알림 */}
        <NotificationPopover />

        {/* 테마 전환 */}
        <ThemeToggle />

        {/* 사용자 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto gap-3 p-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70" />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">관리자</p>
                <p className="text-xs text-muted-foreground">admin@acadesk.com</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>내 계정</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>내 정보</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>설정</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              disabled={isLoggingOut}
              className="cursor-pointer"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>로그아웃 중...</span>
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
})

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  // 현재 사용자 정보 조회 (안전하게 - 에러 던지지 않음)
  const { user, loading } = useCurrentUser()

  // 로그아웃 처리
  const { logout, isLoading: isLoggingOut } = useLogout()

  // 태블릿 이상 여부 감지 (768px 이상에서 사이드바 표시)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  // 큰 데스크톱 감지 (1024px 이상)
  const isLargeDesktop = useMediaQuery("(min-width: 1024px)")

  // 인증 및 온보딩 상태 확인
  useEffect(() => {
    if (loading) return

    // 로그인 안 됨
    if (!user) {
      router.push('/auth/login')
      return
    }

    // 온보딩 미완료 - routeAfterLogin으로 위임
    // (get_auth_stage가 자동으로 올바른 페이지로 라우팅)
    if (!user.onboardingCompleted) {
      // 단, dashboard layout에서는 간단히 로그인으로 리디렉트
      // (실제 상태 확인은 login에서 routeAfterLogin이 처리)
      router.push('/auth/login')
      return
    }

    // tenant_id 없음 (배너로 처리하므로 리디렉션하지 않음)
    // 이 경우는 아래 렌더링에서 배너 표시
  }, [loading, user, router])

  // 화면 크기에 따라 사이드바 자동 축소/펼침
  useEffect(() => {
    // 태블릿 크기(768px ~ 1023px)에서는 축소, 큰 데스크톱(1024px 이상)에서는 펼침
    if (isDesktop && !isLargeDesktop) {
      setIsCollapsed(true)
    } else if (isLargeDesktop) {
      setIsCollapsed(false)
    }
  }, [isDesktop, isLargeDesktop])

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)

  // 로딩 중이면 로딩 화면 표시
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  // tenant_id 없는 경우: 안내 배너 표시
  const hasTenantIssue = user && !user.tenantId
  if (hasTenantIssue) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-6">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
              계정 설정이 완료되지 않았습니다
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              관리자가 계정 설정을 완료하는 중입니다. 잠시 후 다시 시도해 주세요.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              문제가 지속되면 관리자에게 문의하세요.
            </p>
          </div>
          <Button
            onClick={logout}
            disabled={isLoggingOut}
            variant="outline"
            className="w-full"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그아웃 중...
              </>
            ) : (
              '로그아웃'
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 데스크톱: 고정 사이드바 */}
      {isDesktop && (
        <motion.div
          className="relative flex-shrink-0"
          animate={{
            width: isCollapsed ? "4rem" : "16rem"
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <DesktopSidebar isCollapsed={isCollapsed} />

          {/* 접기/펼치기 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-20 h-6 w-6 rounded-full border bg-background shadow-md transition-all duration-300 ease-in-out z-10"
            style={{
              left: isCollapsed ? '3.25rem' : '15.25rem',
            }}
            onClick={toggleSidebar}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </motion.div>
      )}

      {/* 모바일: Sheet (오프캔버스) 메뉴 */}
      {!isDesktop && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>메뉴</SheetTitle>
            </SheetHeader>
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={toggleMobileMenu}
          showMenuButton={!isDesktop}
          onLogout={logout}
          isLoggingOut={isLoggingOut}
        />

        {/* 메인 - 페이지 컨텐츠만 전환 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 md:p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  )
}
