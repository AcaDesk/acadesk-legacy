import { Loader2 } from 'lucide-react'

/**
 * Dashboard Global Loading State
 *
 * 대시보드의 모든 페이지에서 사용되는 기본 로딩 상태입니다.
 * 페이지별로 더 구체적인 loading.tsx를 만들면 해당 페이지는 그것을 우선 사용합니다.
 *
 * 사용 위치:
 * - 대시보드 내 모든 페이지 (페이지별 loading.tsx가 없는 경우)
 */
export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">페이지를 불러오는 중...</p>
      </div>
    </div>
  )
}
