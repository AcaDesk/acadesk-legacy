"use client"

import { useState, memo, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Menu,
  Loader2,
  Sun,
  Moon,
  Monitor,
  MonitorPlay,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { AppNav } from "@/components/layout/app-nav"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { HelpMenu } from "@/components/layout/help-menu"
import { NotificationPopover } from "@/components/layout/notification-popover"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@ui/button"
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
import { Avatar, AvatarFallback, AvatarImage } from "@ui/avatar"
import { ConfirmationDialog } from "@ui/confirmation-dialog"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useStandaloneMode } from "@/hooks/use-standalone-mode"
import { usePathname, useRouter } from "next/navigation"

interface DashboardShellProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
  userRole?: string
  userTenantName?: string
  userAvatarUrl?: string
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

      {/* 하단 액션 */}
      <div className={cn("border-t p-2 shrink-0", isCollapsed ? "px-2" : "px-3")}>
        <Link href="/kiosk" onClick={onNavigate}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all duration-200",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "hover:scale-[1.02] active:scale-[0.98]",
              isCollapsed ? "justify-center px-2" : "px-3"
            )}
            title={isCollapsed ? "키오스크 모드" : undefined}
          >
            <MonitorPlay className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && (
              <motion.span
                className="whitespace-nowrap"
                animate={{ opacity: isCollapsed ? 0 : 1 }}
                transition={{ duration: 0.2 }}
              >
                키오스크 모드
              </motion.span>
            )}
          </div>
        </Link>
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
      className="relative h-full border-r bg-card overflow-hidden transition-all duration-300 ease-out"
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
  userName,
  userEmail,
  userRole,
  userTenantName,
  userAvatarUrl,
}: {
  onMenuClick?: () => void
  showMenuButton?: boolean
  onLogout?: () => void
  isLoggingOut?: boolean
  userName?: string
  userEmail?: string
  userRole?: string
  userTenantName?: string
  userAvatarUrl?: string
  isStandalone?: boolean
}) {
  const { theme, setTheme } = useTheme()
  const [themeMounted, setThemeMounted] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  useEffect(() => {
    setThemeMounted(true)
  }, [])

  // 역할 코드를 한글로 변환
  const getRoleLabel = (roleCode?: string) => {
    const roleMap: Record<string, string> = {
      'owner': '원장',
      'instructor': '강사',
      'assistant': '조교',
      'parent': '학부모',
      'student': '학생',
    }
    return roleCode ? roleMap[roleCode] || roleCode : '사용자'
  }

  const displayName = userName?.trim() || userEmail?.split('@')[0] || '사용자'
  const avatarInitial = displayName.charAt(0) || '?'
  const roleLabel = getRoleLabel(userRole)
  const tenantLabel = userTenantName?.trim() || '소속 없음'

  const handleLogoutRequest = () => {
    if (isLoggingOut) return
    setLogoutDialogOpen(true)
  }

  const handleConfirmLogout = async () => {
    await onLogout?.()
  }

  return (
    <>
      <header className={cn(
        "flex items-center justify-between border-b bg-card px-4 md:px-6",
        isStandalone ? "h-12" : "h-16"
      )}>
        {/* 모바일: 햄버거 메뉴 + 로고 / standalone: 타이틀 */}
        <div className="flex items-center gap-4 md:hidden">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              aria-label="메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-bold">
            {isStandalone ? '출석 관리' : 'Acadesk'}
          </h1>
        </div>

        {/* 데스크톱 standalone 타이틀 */}
        {isStandalone && (
          <div className="hidden md:flex items-center gap-2">
            <h1 className="text-lg font-bold">출석 관리</h1>
          </div>
        )}

        {/* 우측 액션 영역 */}
        <div className="ml-auto flex items-center gap-2">
          {/* 도움말 + 알림: standalone에서 숨김 */}
          {!isStandalone && <HelpMenu />}
          {!isStandalone && <NotificationPopover />}

          {/* 테마 전환: 모바일에서는 사용자 메뉴로 통합 */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* 사용자 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto gap-3 p-2"
                aria-label={`${displayName} 사용자 메뉴 열기`}
              >
                <Avatar className="h-8 w-8 border border-border/60">
                  {userAvatarUrl ? (
                    <AvatarImage src={userAvatarUrl} alt={`${displayName} 프로필 이미지`} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-xs font-semibold">
                    {avatarInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel} · {tenantLabel}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail || ''}</p>
                  <p className="text-xs leading-none text-muted-foreground">{roleLabel} · {tenantLabel}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!isStandalone && (
                <>
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
                </>
              )}
              <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">테마</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer">
                <Sun className="mr-2 h-4 w-4" />
                <span>라이트</span>
                {themeMounted && theme === 'light' && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer">
                <Moon className="mr-2 h-4 w-4" />
                <span>다크</span>
                {themeMounted && theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer">
                <Monitor className="mr-2 h-4 w-4" />
                <span>시스템</span>
                {themeMounted && theme === 'system' && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogoutRequest}
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

      <ConfirmationDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="로그아웃하시겠습니까?"
        description="현재 작업 중인 내용이 저장되지 않았다면 손실될 수 있습니다."
        confirmText="로그아웃"
        cancelText="취소"
        variant="default"
        isLoading={isLoggingOut}
        onConfirm={handleConfirmLogout}
      />
    </>
  )
})

/**
 * Dashboard Shell Component
 *
 * ✅ 역할: UI 상태만 관리 (사이드바 토글, 모바일 메뉴, 애니메이션)
 * ❌ 하지 않음: 인증/권한 체크 (서버 레이아웃에서 처리)
 *
 * 이 컴포넌트는 순수 UI 로직만 담당하며,
 * 서버 컴포넌트 (dashboard/layout.tsx)가 이미 인증을 완료한 후 호출됩니다.
 */
export function DashboardShell({
  children,
  userName,
  userEmail,
  userRole,
  userTenantName,
  userAvatarUrl,
}: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 로그아웃 처리
  const { logout, isLoading: isLoggingOut } = useLogout()

  // PWA standalone 모드 감지
  const isStandalone = useStandaloneMode()
  const pathname = usePathname()
  const router = useRouter()

  // standalone 모드에서 출석 페이지 이외 접근 시 리다이렉트
  useEffect(() => {
    if (isStandalone && !pathname.startsWith('/attendance')) {
      router.replace('/attendance')
    }
  }, [isStandalone, pathname, router])

  // 태블릿 이상 여부 감지 (768px 이상에서 사이드바 표시)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  // 큰 데스크톱 감지 (1024px 이상)
  const isLargeDesktop = useMediaQuery("(min-width: 1024px)")

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 데스크톱: 고정 사이드바 (standalone 모드에서는 숨김) */}
      {isDesktop && !isStandalone && (
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

      {/* 모바일: Sheet (오프캔버스) 메뉴 (standalone 모드에서는 숨김) */}
      {!isDesktop && !isStandalone && (
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
          showMenuButton={!isDesktop && !isStandalone}
          onLogout={logout}
          isLoggingOut={isLoggingOut}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userTenantName={userTenantName}
          userAvatarUrl={userAvatarUrl}
          isStandalone={isStandalone}
        />

        {/* 메인 - 페이지 컨텐츠만 전환 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          {!isStandalone && (
            <div className="px-6 lg:px-8 pt-6">
              <Breadcrumbs />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
