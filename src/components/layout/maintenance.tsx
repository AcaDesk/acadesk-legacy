import Link from "next/link"
import { Button } from "@ui/button"
import { Card, CardContent } from "@ui/card"
import { Wrench, ArrowLeft, RefreshCcw, Shield, Clock } from "lucide-react"

interface MaintenanceProps {
  featureName: string
  estimatedTime?: string
  reason?: string
}

/**
 * 일시 점검 중인 기능에 대한 안내 페이지
 * 사용자에게 기능이 일시적으로 사용 불가능함을 알리고 신뢰를 유지합니다.
 */
export function Maintenance({ featureName, estimatedTime, reason }: MaintenanceProps) {
  const defaultReason = "더 나은 서비스를 제공하기 위한 시스템 점검이 진행 중입니다."

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-orange-200 dark:border-orange-900">
        <CardContent className="pt-12 pb-12 px-6 md:px-12 text-center space-y-6">
          {/* 아이콘 */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center border-2 border-orange-200 dark:border-orange-900">
                <Wrench className="h-12 w-12 text-orange-600 dark:text-orange-500" />
              </div>
              {/* 회전 애니메이션 효과 */}
              <div className="absolute inset-0 rounded-full border-2 border-orange-300 dark:border-orange-800 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {featureName} 점검 중
            </h1>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 dark:bg-orange-950/30 px-4 py-1.5 text-sm font-medium text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              <Clock className="h-3 w-3 animate-pulse" />
              일시 점검 중
            </div>
          </div>

          {/* 설명 */}
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            <span className="font-semibold text-foreground">{featureName}</span> 기능이 현재 점검 중입니다.
            {' '}{reason || defaultReason}
          </p>

          {/* 예상 완료 시간 */}
          {estimatedTime && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-orange-700 dark:text-orange-400">
                <Clock className="h-5 w-5" />
                <div className="text-left">
                  <div className="text-sm font-medium">예상 완료 시간</div>
                  <div className="text-base font-bold">{estimatedTime}</div>
                </div>
              </div>
            </div>
          )}

          {/* 구분선 */}
          <div className="h-px bg-border max-w-md mx-auto" />

          {/* 안심 메시지 */}
          <div className="bg-muted/50 rounded-lg p-6 max-w-xl mx-auto">
            <div className="flex items-start gap-3 text-left">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  데이터는 안전합니다
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  원장님의 모든 데이터는 안전하게 보관되고 있으니 안심하세요.
                  점검이 완료되면 모든 기능을 정상적으로 이용하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                대시보드로 돌아가기
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="h-4 w-4" />
              새로고침
            </Button>
          </div>

          {/* 하단 안내 */}
          <p className="text-xs text-muted-foreground pt-4">
            점검이 예상보다 길어지거나 긴급한 경우 관리자에게 문의해주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
