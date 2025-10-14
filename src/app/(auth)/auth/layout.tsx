import Link from "next/link"
import { GraduationCap } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* 공통 로고 */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 font-semibold"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-2xl">Acadesk</span>
        </Link>

        {/* 각 페이지의 실제 콘텐츠 */}
        {children}
      </div>
    </div>
  )
}
