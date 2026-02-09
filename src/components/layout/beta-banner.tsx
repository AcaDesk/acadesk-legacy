import { Alert, AlertDescription, AlertTitle } from "@ui/alert"
import { Badge } from "@ui/badge"
import { TestTube, AlertTriangle, MessageSquare } from "lucide-react"
import { Button } from "@ui/button"
import Link from "next/link"

interface BetaBannerProps {
  featureName: string
  description?: string
  feedbackUrl?: string
}

/**
 * 베타 테스트 중인 기능에 대한 안내 배너
 * 페이지 상단에 표시되며 사용자에게 베타 상태임을 알립니다.
 */
export function BetaBanner({ featureName, description, feedbackUrl }: BetaBannerProps) {
  const defaultDescription = "이 기능은 현재 베타 테스트 중입니다. 일부 기능이 변경되거나 예상대로 작동하지 않을 수 있습니다."

  return (
    <Alert className="border-warning/20 bg-warning/5 mb-6">
      <TestTube className="h-4 w-4 text-warning" />
      <AlertTitle className="flex items-center gap-2 text-warning">
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
          BETA
        </Badge>
        {featureName} - 베타 테스트 중
      </AlertTitle>
      <AlertDescription className="text-warning mt-2 space-y-3">
        <p>{description || defaultDescription}</p>

        <div className="flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">주의사항:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              <li>실제 운영 데이터에 영향을 줄 수 있습니다</li>
              <li>일부 기능이 불안정하거나 변경될 수 있습니다</li>
              <li>버그나 문제점을 발견하시면 즉시 알려주세요</li>
            </ul>
          </div>
        </div>

        {feedbackUrl && (
          <div className="pt-2">
            <Button variant="outline" size="sm" asChild className="gap-2 border-warning/20">
              <Link href={feedbackUrl}>
                <MessageSquare className="h-3 w-3" />
                피드백 보내기
              </Link>
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
