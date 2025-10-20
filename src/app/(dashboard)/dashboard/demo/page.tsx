import { Suspense } from 'react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InfoIcon, Lightbulb, Zap, Shield } from 'lucide-react'
import { RecentActivityFeedAsync } from '@/components/features/dashboard/recent-activity-feed-async'
import { RecentStudentsCardAsync } from '@/components/features/dashboard/recent-students-card-async'
import { FinancialSnapshotAsync } from '@/components/features/dashboard/financial-snapshot-async'
import { QuickStatsAsync } from '@/components/features/dashboard/quick-stats-async'
import { AsyncWidgetDemo } from '@/components/features/dashboard/async-widget-example'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '대시보드 데모 - 비동기 위젯',
  description: 'React Suspense와 Error Boundary를 활용한 세분화된 에러 처리 및 로딩 상태 데모',
}

/**
 * 비동기 위젯 데모 페이지
 *
 * 이 페이지는 다음 패턴을 시연합니다:
 * 1. 각 위젯이 독립적으로 데이터를 fetch
 * 2. Suspense로 위젯별 로딩 상태 표시
 * 3. Error Boundary로 위젯별 에러 격리
 * 4. 하나의 위젯 실패가 전체 페이지에 영향을 주지 않음
 */
export default function DashboardDemoPage() {
  return (
    <PageWrapper>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">비동기 위젯 데모</h1>
              <p className="text-muted-foreground">
                세분화된 에러 처리 및 로딩 상태 관리 패턴
              </p>
            </div>
          </div>

          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>데모 페이지</AlertTitle>
            <AlertDescription>
              이 페이지는 React Suspense와 Error Boundary를 활용한 새로운 패턴을 시연합니다.
              각 위젯은 독립적으로 데이터를 로드하며, 하나의 위젯이 실패해도 다른 위젯들은 정상 작동합니다.
            </AlertDescription>
          </Alert>
        </div>

        {/* 핵심 개념 설명 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Zap className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-base">Suspense</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                각 위젯이 데이터를 로드하는 동안 스켈레톤을 표시합니다.
                전체 페이지가 아닌 해당 위젯만 로딩 상태를 보여줍니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <CardTitle className="text-base">Error Boundary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                위젯 로딩 중 에러가 발생하면 해당 위젯만 에러 메시지를 표시합니다.
                다른 위젯들은 계속 정상 작동합니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                </div>
                <CardTitle className="text-base">격리된 실패</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                하나의 위젯 실패가 전체 페이지에 영향을 주지 않습니다.
                사용자는 다른 기능을 계속 사용할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 실제 비동기 위젯 데모 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">실시간 위젯</h2>
              <p className="text-sm text-muted-foreground">
                각 위젯이 독립적으로 데이터를 로드합니다
              </p>
            </div>
            <Badge variant="secondary" className="gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              실시간 데이터
            </Badge>
          </div>

          {/* 3열 그리드 - 통계 위젯들 */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* 빠른 통계 - 비동기 */}
            <QuickStatsAsync />

            {/* 재무 현황 - 비동기 */}
            <FinancialSnapshotAsync />

            {/* 최근 활동 피드 - 비동기 */}
            <RecentActivityFeedAsync maxItems={6} />
          </div>

          {/* 2열 그리드 - 상세 위젯들 */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* 최근 등록 학생 - 비동기 */}
            <RecentStudentsCardAsync maxDisplay={5} />

            {/* 추가 활동 피드 - 비동기 */}
            <RecentActivityFeedAsync maxItems={10} />
          </div>
        </div>

        {/* 추가 예제 섹션 */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">추가 예제</h2>
            <p className="text-sm text-muted-foreground">
              더 많은 비동기 위젯 패턴
            </p>
          </div>

          <AsyncWidgetDemo />
        </div>

        {/* 구현 가이드 */}
        <Card className="bg-muted/50 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              구현 가이드
            </CardTitle>
            <CardDescription>
              이 패턴을 다른 페이지에 적용하는 방법
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-2">1. 비동기 Server Component 생성</p>
                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
{`async function MyWidget() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('table').select('*')
  if (error) throw new Error('데이터 로딩 실패')
  return <Card>...</Card>
}`}
                </pre>
              </div>

              <div>
                <p className="font-medium mb-2">2. Error Boundary와 Suspense로 감싸기</p>
                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
{`export function MyWidgetAsync() {
  return (
    <ErrorBoundary fallbackRender={ErrorFallback}>
      <Suspense fallback={<WidgetSkeleton />}>
        <MyWidget />
      </Suspense>
    </ErrorBoundary>
  )
}`}
                </pre>
              </div>

              <div>
                <p className="font-medium mb-2">3. 페이지에서 사용</p>
                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
{`export default function Page() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <MyWidgetAsync />
      <AnotherWidgetAsync />
    </div>
  )
}`}
                </pre>
              </div>
            </div>

            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>참고:</strong> 상세한 문서는{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  docs/error-and-loading-strategy.md
                </code>
                를 참조하세요.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Performance 참고사항 */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <InfoIcon className="h-5 w-5" />
              성능 고려사항
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <p>
              <strong>하이브리드 접근 권장:</strong> 모든 위젯을 독립적으로 만들 필요는 없습니다.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>빠른 데이터 (KPI 등): 한 번의 RPC 호출로 가져오기</li>
              <li>무거운 데이터 (활동 로그, 복잡한 쿼리): 독립적인 비동기 위젯으로 분리</li>
              <li>실시간 업데이트가 필요한 데이터: React Query + Client Component</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
