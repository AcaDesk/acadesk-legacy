import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertOctagon, Calendar, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface DeprecatedBannerProps {
  featureName: string
  reason?: string
  endOfLifeDate?: string
  migrationUrl?: string
  replacementFeature?: string
}

/**
 * 단계적 폐지 예정 기능에 대한 경고 배너
 * 페이지 상단에 표시되며 사용자에게 대체 방안을 안내합니다.
 */
export function DeprecatedBanner({
  featureName,
  reason,
  endOfLifeDate,
  migrationUrl,
  replacementFeature
}: DeprecatedBannerProps) {
  const defaultReason = "더 나은 기능으로 대체되기 위해 이 기능은 단계적으로 폐지될 예정입니다."

  return (
    <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 mb-6">
      <AlertOctagon className="h-4 w-4 text-red-600 dark:text-red-500" />
      <AlertTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
        <Badge variant="destructive" className="font-semibold">
          DEPRECATED
        </Badge>
        {featureName} - 단계적 폐지 예정
      </AlertTitle>
      <AlertDescription className="text-red-800 dark:text-red-200 mt-2 space-y-3">
        <p>{reason || defaultReason}</p>

        {endOfLifeDate && (
          <div className="flex items-center gap-2 text-sm p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <div>
              <span className="font-medium">서비스 종료 예정일:</span> {endOfLifeDate}
            </div>
          </div>
        )}

        {replacementFeature && (
          <div className="flex items-start gap-2 text-sm">
            <ArrowRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-500" />
            <div>
              <p className="font-medium">대체 기능:</p>
              <p className="ml-2 mt-1">
                <span className="font-semibold text-green-700 dark:text-green-400">{replacementFeature}</span> 기능을 사용해주세요.
              </p>
            </div>
          </div>
        )}

        {migrationUrl && (
          <div className="pt-2">
            <Button variant="outline" size="sm" asChild className="gap-2 border-red-300 dark:border-red-700">
              <Link href={migrationUrl}>
                <ArrowRight className="h-3 w-3" />
                새 기능으로 이동
              </Link>
            </Button>
          </div>
        )}

        <p className="text-xs text-red-700 dark:text-red-300 pt-2 border-t border-red-200 dark:border-red-800">
          ⚠️ 이 기능은 계속 사용할 수 있지만, 새로운 업데이트나 지원이 제공되지 않습니다.
          가능한 빨리 대체 기능으로 전환하시기 바랍니다.
        </p>
      </AlertDescription>
    </Alert>
  )
}
