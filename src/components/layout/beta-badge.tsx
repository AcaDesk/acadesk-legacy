import { Badge } from "@ui/badge"
import { Sparkles } from "lucide-react"

interface BetaBadgeProps {
  featureName: string
  children: React.ReactNode
}

/**
 * 베타 테스트 중인 기능을 위한 래퍼 컴포넌트
 * 실제 기능을 표시하되, 베타 배지를 추가합니다.
 */
export function BetaBadge({ featureName, children }: BetaBadgeProps) {
  return (
    <div className="relative">
      {/* 베타 배지 */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="secondary" className="gap-1.5 bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800">
          <Sparkles className="h-3 w-3" />
          베타 테스트 중
        </Badge>
      </div>

      {/* 실제 기능 컴포넌트 */}
      {children}

      {/* 하단 안내 */}
      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
        <p className="text-sm text-purple-700 dark:text-purple-400">
          💡 <span className="font-semibold">{featureName}</span> 기능은 현재 베타 테스트 중입니다.
          사용 중 문제가 발생하거나 개선 사항이 있다면 피드백을 보내주세요!
        </p>
      </div>
    </div>
  )
}
