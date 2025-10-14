import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DeprecatedProps {
  featureName: string
  replacementFeature?: string
  removalDate?: string
  children: React.ReactNode
}

/**
 * 단계적 폐지 예정인 기능을 위한 래퍼 컴포넌트
 * 실제 기능을 표시하되, 경고 메시지를 추가합니다.
 */
export function Deprecated({
  featureName,
  replacementFeature,
  removalDate,
  children
}: DeprecatedProps) {
  return (
    <div className="space-y-4">
      {/* 경고 배너 */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>⚠️ 이 기능은 곧 사용이 중단됩니다</AlertTitle>
        <AlertDescription>
          <span className="font-semibold">{featureName}</span> 기능은 단계적으로 폐지될 예정입니다.
          {replacementFeature && (
            <> 대신 <span className="font-semibold">{replacementFeature}</span> 기능을 사용해주세요.</>
          )}
          {removalDate && (
            <> 예정된 제거 일자: <span className="font-semibold">{removalDate}</span></>
          )}
        </AlertDescription>
      </Alert>

      {/* 실제 기능 컴포넌트 (흐릿하게 표시) */}
      <div className="opacity-60">
        {children}
      </div>
    </div>
  )
}
