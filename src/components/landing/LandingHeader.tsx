"use client"

import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { Button } from "@ui/button"
import { User } from "@supabase/supabase-js"

interface LandingHeaderProps {
  user: User | null
}

export function LandingHeader({ user }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg">Acadesk</span>
        </Link>

        {/* 내비게이션 */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            기능
          </Link>
          <Link
            href="#testimonials"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            후기
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            요금
          </Link>
        </nav>

        {/* CTA 버튼 - 로그인 상태에 따라 다름 */}
        <div className="flex items-center gap-4">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">대시보드로 이동</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/auth/login">로그인</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">무료 시작하기</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
