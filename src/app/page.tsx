import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from "@/lib/supabase/server"
import { Button } from '@ui/button'
import { GraduationCap, User } from 'lucide-react'

// Force dynamic rendering (uses cookies for user authentication check)
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 로그인한 사용자는 대시보드로 리다이렉트
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-8 px-4">
        {/* 로고 */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-12 w-12" />
          </div>
        </div>

        {/* 프로젝트 이름 */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">Acadesk</h1>
          <p className="text-lg text-muted-foreground">학원 관리 시스템</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-4">
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/login">로그인</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/auth/signup">시작하기</Link>
            </Button>
          </div>

          {/* 키오스크 버튼 */}
          <div className="pt-4 border-t border-border/40 w-full max-w-md">
            <Button asChild variant="ghost" className="w-full gap-2">
              <Link href="/kiosk/login">
                <User className="h-4 w-4" />
                학생 키오스크
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
