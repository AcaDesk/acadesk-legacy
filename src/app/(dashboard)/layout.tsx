"use client"

import { useState, memo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, User, Settings, LogOut } from "lucide-react"
import { AppNav } from "@/components/layout/app-nav"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Memoize static components to prevent re-renders
const Sidebar = memo(function Sidebar({
  isCollapsed
}: {
  isCollapsed: boolean
}) {
  return (
    <motion.aside
      className="relative h-full border-r bg-card overflow-hidden"
      animate={{
        width: isCollapsed ? "4rem" : "16rem"
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* 로고와 네비게이션을 포함하는 컨텐츠 래퍼 */}
      <div className="flex h-full flex-col">
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
        <div className="flex-1">
          <AppNav isCollapsed={isCollapsed} />
        </div>
      </div>
    </motion.aside>
  )
})

const Header = memo(function Header() {
  return (
    <header className="flex h-16 items-center justify-end border-b bg-card px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-3 p-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70" />
            <div className="text-left">
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
          <form action="/auth/logout" method="POST" className="w-full">
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
})

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)

  return (
    <div className="flex h-screen">
      {/* Sidebar와 Button을 함께 감싸는 relative 컨테이너 */}
      <div className="relative">
        <Sidebar isCollapsed={isCollapsed} />

        {/* 버튼을 Sidebar 밖으로 이동 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-20 h-6 w-6 rounded-full border bg-background shadow-md transition-all duration-300 ease-in-out"
          style={{
            left: isCollapsed ? '3.25rem' : '15.25rem', // 4rem - 0.75rem, 16rem - 0.75rem
          }}
          onClick={toggleSidebar}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        {/* 메인 - 페이지 컨텐츠만 전환 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
