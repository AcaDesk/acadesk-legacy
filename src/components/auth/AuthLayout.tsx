import { GraduationCap } from "lucide-react"
import Link from "next/link"

interface AuthLayoutProps {
  children: React.ReactNode
  brandingContent: React.ReactNode
  gridCols?: string
  formMaxWidth?: string
}

export function AuthLayout({
  children,
  brandingContent,
  gridCols = "lg:grid-cols-[1.5fr,1fr]",
  formMaxWidth = "max-w-xl",
}: AuthLayoutProps) {
  return (
    <div className={`grid min-h-svh ${gridCols}`}>
      {/* 왼쪽: 브랜딩 영역 (더 큰 비율) */}
      <div className="relative hidden bg-background lg:block overflow-hidden">
        {brandingContent}
      </div>

      {/* 오른쪽: 폼 영역 */}
      <div className="flex flex-col gap-4 p-6 md:p-10 lg:p-16 bg-background">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            Acadesk
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className={`w-full ${formMaxWidth}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}
