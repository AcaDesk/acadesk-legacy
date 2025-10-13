import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, ArrowLeft, Bell } from "lucide-react"

interface ComingSoonProps {
  featureName: string
  description?: string
}

/**
 * 피처 플래그로 비활성화된 기능에 대한 안내 페이지
 * 사용자에게 기능이 준비 중임을 알리고 기대감을 형성합니다.
 */
export function ComingSoon({ featureName, description }: ComingSoonProps) {
  const defaultDescription = `${featureName} 기능을 현재 열심히 준비하고 있습니다. 더 완벽한 모습으로 찾아뵙기 위한 최종 점검 중이니 조금만 기다려주세요!`

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2">
        <CardContent className="pt-12 pb-12 px-6 md:px-12 text-center space-y-6">
          {/* 아이콘 */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              {/* 반짝이는 애니메이션 효과 */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {featureName}, 곧 찾아옵니다!
            </h1>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              출시 준비 중
            </div>
          </div>

          {/* 설명 */}
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            원장님의 학원 운영을 더욱 편리하게 만들어드릴 <span className="font-semibold text-foreground">{featureName}</span>{" "}
            {description || defaultDescription}
          </p>

          {/* 구분선 */}
          <div className="h-px bg-border max-w-md mx-auto" />

          {/* 가치 제안 */}
          <div className="bg-muted/50 rounded-lg p-6 max-w-xl mx-auto">
            <p className="text-sm text-muted-foreground leading-relaxed">
              💡 <span className="font-medium text-foreground">이 기능이 출시되면</span>,
              업무 효율이 크게 향상되고 학생 관리가 한층 더 편리해질 예정입니다.
            </p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                대시보드로 돌아가기
              </Link>
            </Button>

            {/* <Button variant="outline" size="lg" className="gap-2">
              <Bell className="h-4 w-4" />
              출시 알림 신청
            </Button> */}
          </div>

          {/* 하단 안내 */}
          <p className="text-xs text-muted-foreground pt-4">
            기능 출시 일정은 관리자에게 문의해주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
